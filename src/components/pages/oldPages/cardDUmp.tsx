export default (
  <>
    <div className="image-card-container">
      {[1, 2, 3].map((card) => {
        return (
          <div className="image-card">
            <div className="image-card-title">LOS ANGELES - DAI POOL</div>
            <div className="image-card-content">
              <div className="image-card-header">
                <span>
                  <span className="">130% APR</span> - FIXED 2YEARS
                </span>
              </div>

              <p className="image-card-paragraph">
                SEEK YOUR FORTUNE IN THE CITY OF SIN. THE HEAT IS ON FOR THE
                PROFIT POTENTIAL OF THE DAI POOL WTH YEARN
              </p>

              <p className="image-card-paragraph">
                GET YOUR C-FOLIO BOI AND START EARNING 100% YIELD PLUS WOWS
                BUSINESS PROFIT.
              </p>
            </div>
          </div>
        );
      })}
    </div>
  </>
);
