// Writes reports/Fe-resource-report.pdf from the model. The app has the same report behind
// its "Download report" button; this is the command-line version.
// Usage: npm run report            (cut-off 45% Fe)
//        npm run report -- 55      (another cut-off)
import { createWriteStream, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import PdfPrinter from "pdfmake";
import { getLease } from "../src/model/lease";
import { buildReport } from "../src/model/report";
import { reportDocument } from "../src/report/reportDocument";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const cut = Number(process.argv[2] ?? 45);
const doc = reportDocument(buildReport(getLease(), cut), "Helvetica");

const printer = new PdfPrinter({
  Helvetica: {
    normal: "Helvetica",
    bold: "Helvetica-Bold",
    italics: "Helvetica-Oblique",
    bolditalics: "Helvetica-BoldOblique",
  },
});

const out = resolve(
  root,
  "reports",
  cut === 45 ? "Fe-resource-report.pdf" : `Fe-resource-report-${cut}.pdf`,
);
mkdirSync(dirname(out), { recursive: true });
const pdf = printer.createPdfKitDocument(doc);
pdf.pipe(createWriteStream(out));
pdf.end();
console.log(`wrote ${out}`);
