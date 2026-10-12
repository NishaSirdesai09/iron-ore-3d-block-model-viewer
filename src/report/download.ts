import { getLease } from "../model/lease";
import { buildReport } from "../model/report";
import { reportDocument, reportFileName } from "./reportDocument";

type Vfs = Record<string, string>;

/**
 * pdfmake ships its Roboto fonts as a classic script that assigns `this.pdfMake.vfs`, which
 * breaks once bundled as a module. Load its text and run it against a plain object instead.
 */
async function loadVfs(): Promise<Vfs> {
  const { default: source } = await import("pdfmake/build/vfs_fonts.js?raw");
  const holder: { pdfMake?: { vfs?: Vfs } } = {};
  new Function(source).call(holder);
  if (!holder.pdfMake?.vfs) throw new Error("Report fonts did not load");
  return holder.pdfMake.vfs;
}

/**
 * Builds the resource report for a cut-off and saves it as a PDF. pdfmake and its fonts
 * (about 2 MB) are only fetched the first time someone downloads a report.
 */
export async function downloadReport(cut: number): Promise<void> {
  const [{ default: pdfMake }, vfs] = await Promise.all([
    import("pdfmake/build/pdfmake"),
    loadVfs(),
  ]);
  const doc = reportDocument(buildReport(getLease(), cut), "Roboto");
  await new Promise<void>((resolve) =>
    pdfMake.createPdf(doc, undefined, undefined, vfs).download(reportFileName(cut), resolve),
  );
}
