import { fmtMt } from "../model/estimate";
import { getLease } from "../model/lease";
import { occurrenceProfiles } from "../model/report";
import { OCC_COL } from "../scene/colors";

/** Ranked once: the lease never changes after start-up. */
const PROFILES = occurrenceProfiles(getLease());

export function GuidePanel() {
  return (
    <div className="about">
      <section className="sec">
        <h2>What this model answers</h2>
        <p>
          Fe shows one iron ore lease as a 3D grid of rock cells. For any part of the ground it
          answers four questions: is there ore, how rich is it, how sure are we, and is it worth
          mining or drilling next.
        </p>
        <p>
          Each cell carries an estimated grade (% Fe), a confidence based on how close the nearest
          drill hole is, the chance it beats the cut-off grade, and an indicative margin per tonne.
        </p>
      </section>
      <section className="sec">
        <h2>How to read it</h2>
        <ol className="steps">
          <li>
            <b>Start with Fe grade.</b> Deep red cells are rich hematite; grey is waste or low-grade
            BHQ. Faded cells have little drilling behind them, so treat their color as a guess.
          </li>
          <li>
            <b>Switch to Confidence.</b> Bright cells sit near drill holes. Dark ground is unknown,
            even if the grade view looks promising there.
          </li>
          <li>
            <b>Check Chance above cut-off.</b> This combines grade and confidence. Cells near 50%
            are the uncertain ones where one more hole changes the picture most.
          </li>
          <li>
            <b>Read a drill log.</b> Click any hole to see rock type and assays down its depth, and
            the best ore interval it cut.
          </li>
          <li>
            <b>Move the cut-off slider.</b> Raising it shows how tonnage shrinks as you demand
            higher grade, which is the basic trade-off in planning a mine.
          </li>
          <li>
            <b>Open Drill plan.</b> Suggested targets are where a new hole would remove the most
            uncertainty. Add a few and watch how many tonnes move to G2 or better.
          </li>
        </ol>
      </section>
      <section className="sec">
        <h2>The words the model uses</h2>
        <div className="gloss">
          <div>
            <h3>Reef ore</h3>
            <p>Hard, massive hematite that forms continuous bodies inside the iron formation.</p>
          </div>
          <div>
            <h3>Pocket deposits</h3>
            <p>
              Small, isolated lenses of rich ore. Valuable, but easy to miss between holes and hard
              to plan around.
            </p>
          </div>
          <div>
            <h3>Blue dust</h3>
            <p>Soft, powdery, very high-grade hematite, common in Indian iron ore belts.</p>
          </div>
          <div>
            <h3>Lateritic ore</h3>
            <p>Weathered, iron-rich cap near the surface with moderate grade.</p>
          </div>
          <div>
            <h3>Float ore</h3>
            <p>
              Loose ore fragments that have broken off outcrops and rolled downslope. A surface clue
              to what lies upslope.
            </p>
          </div>
          <div>
            <h3>Core drilling and RC drilling</h3>
            <p>
              These are exploration methods, not ore types. Core (diamond) drilling recovers an
              intact cylinder of rock for logging and assay; reverse circulation is faster and
              cheaper but returns chips.
            </p>
          </div>
        </div>
      </section>
      <section className="sec" aria-labelledby="rank-h">
        <h2 id="rank-h">Occurrences ranked by grade</h2>
        <table className="rank">
          <thead>
            <tr>
              <th scope="col">Occurrence</th>
              <th scope="col">Fe range</th>
              <th scope="col">Avg Fe</th>
              <th scope="col">Purity*</th>
            </tr>
          </thead>
          <tbody>
            {PROFILES.map((p, a) => (
              <tr key={p.occ}>
                <th scope="row">
                  <span className="rank-name">
                    <em>{a + 1}</em>
                    <i style={{ background: p.occ ? OCC_COL[p.occ] : "var(--rockWaste)" }} />
                    {p.name}
                  </span>
                  <small>
                    {fmtMt(p.tonnes)} Mt · {p.estMin.toFixed(0)}–{p.estMax.toFixed(0)}% found
                  </small>
                </th>
                <td>
                  {p.range[0]}–{p.range[1]}%
                </td>
                <td>{p.grade.toFixed(1)}%</td>
                <td>{p.occ ? `${Math.round(p.purity * 100)}%` : "–"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="hint">
          <b>Fe range</b> is the true iron content each rock is generated with. Estimates can stray
          a little outside it where drilling is sparse; the small text shows the range actually
          found in the model, and its tonnes.
        </p>
        <p className="hint">
          <b>*Purity</b> is the share of hematite (Fe<sub>2</sub>O<sub>3</sub>) the average grade
          implies: Fe% ÷ 69.9, because pure hematite is 69.9% Fe. It is an approximation; the iron
          in laterite is often goethite rather than hematite, and waste is not rated.
        </p>
        <p className="hint">
          In Indian trade, hematite ore is commonly called high grade at 65% Fe or more, medium
          grade at 62–65% and low grade below 62%. Reef and pocket ore have similar grades; pockets
          rank lower in practice because they are small, less drilled and harder to mine.
        </p>
      </section>
      <section className="sec">
        <h2>What is simulated</h2>
        <p className="hint" style={{ margin: 0 }}>
          All geology, assays and prices are synthetic and illustrative. Cells are 25 m × 25 m × 10
          m, shown with 1.5× vertical exaggeration. Confidence comes from distance to the nearest
          drill hole; estimated grade wanders further from the true value where confidence is low.
        </p>
      </section>
    </div>
  );
}
