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
