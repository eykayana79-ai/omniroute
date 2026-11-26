import {
  Bar,
  Badge,
  Button,
  Collapse,
  Count,
  Meter,
  Phone,
  Row,
  Stage,
  States,
  type Act,
} from "../../kit";
import "./video.css";
import kaftan from "./kaftan.png";
import photo from "./photo.jpg";

// Roselle RTW Payday Sale, 9:16, ~16s. Five beats, one stage:
//  1 hook   : the sale poster on its pink locker, one question pops on
//  2 offer  : a kraft card drops on the locker: beli RM200, FREE KAFTAN
//  3 cart   : one step short (RM179.10), a second item lands, the meter
//             fills and the free kaftan unlocks
//  4 kaftan : the kaftan alone, with the rules in small print
//  5 live   : end card, the same style as the Kurung Delia video
//
// Rules shown (confirmed by the seller): RM200 is the final amount paid
// after voucher; one kaftan per order; stock is limited; design is random.
// RM179.10 is the real price of the Dahliah kurung; the second item and its
// price (RM39.00) are a placeholder to replace with a real product.

type S = {
  scene: number;
  z: boolean;
  k1: number;
  k2: number;
  k3: number;
  k4: number;
  k5: number;
};
const START: S = { scene: 1, z: false, k1: 0, k2: 0, k3: 0, k4: 0, k5: 0 };

const GOAL = 200;
const ITEM1 = 179.1;
const ITEM2 = 39.0;

const script = async (a: Act<S>) => {
  // 1 hook
  a.put({ z: true });
  await a.wait(350);
  a.mark("hook");
  a.put({ k1: 1 });
  await a.wait(2200);
  // 2 offer
  a.mark("offer");
  a.put({ scene: 2, k2: 1 });
  await a.wait(450);
  a.put({ k2: 2 });
  await a.wait(300);
  a.put({ k2: 3 });
  await a.wait(300);
  a.put({ k2: 4 });
  await a.wait(500);
  a.put({ k2: 5 });
  await a.wait(450);
  a.put({ k2: 6 });
  await a.wait(1500);
  // 3 cart
  a.mark("cart");
  a.put({ scene: 3, k3: 1 });
  await a.wait(1500);
  a.put({ k3: 2 }); // the nudge is read: one step short
  await a.wait(1500);
  a.mark("add");
  a.put({ k3: 3 }); // a second item lands, the total passes RM200
  await a.wait(1300);
  a.put({ k3: 4 }); // the kaftan unlocks
  await a.wait(1900);
  // 4 kaftan
  a.mark("kaftan");
  a.put({ scene: 4, k4: 1 });
  await a.wait(600);
  a.put({ k4: 2 });
  await a.wait(500);
  a.put({ k4: 3 });
  await a.wait(500);
  a.put({ k4: 4 });
  await a.wait(1700);
  // 5 live
  a.mark("live");
  a.put({ scene: 5, k5: 1 });
  await a.wait(350);
  a.put({ k5: 2 });
  await a.wait(300);
  a.put({ k5: 3 });
  await a.wait(300);
  a.put({ k5: 4 });
  await a.wait(500);
  a.put({ k5: 5 });
  await a.wait(2600);
};

const money = (n: number) => `RM${n.toFixed(2)}`;

export default function RoselleVideo() {
  return (
    <Stage<S>
      width={405}
      height={720}
      initial={START}
      play="once"
      accent="#e0488a"
      poster={{ scene: 5, z: true, k1: 1, k2: 6, k3: 4, k4: 4, k5: 5 }}
      script={script}
      className="rv"
    >
      {(s) => {
        const added = s.k3 >= 3;
        const total = added ? ITEM1 + ITEM2 : ITEM1;
        return (
          <>
            {/* The locker poster, shared by beats 1 and 2 */}
            <div
              className="rv-lock"
              data-on={s.scene <= 2 || undefined}
              data-z={s.z || undefined}
            />

            {/* 1 hook */}
            <div className="rv-hook" data-on={s.scene === 1 || undefined}>
              <div className="rv-sticker" data-in={s.k1 >= 1 || undefined}>
                Gaji dah masuk? 💸
              </div>
            </div>

            {/* 2 offer */}
            <div className="rv-offer" data-on={s.scene === 2 || undefined}>
              <div className="rv-card" data-in={s.k2 >= 1 || undefined}>
                <i className="rv-tape" style={{ left: -22, top: -8, rotate: "-38deg" }} />
                <i className="rv-tape" style={{ right: -22, top: -8, rotate: "38deg" }} />
                <i className="rv-tape" style={{ left: -22, bottom: -8, rotate: "38deg" }} />
                <i className="rv-tape" style={{ right: -22, bottom: -8, rotate: "-38deg" }} />
                <div className="rv-beli rv-pop" data-in={s.k2 >= 2 || undefined}>
                  beli
                </div>
                <div className="rv-rm rv-pop" data-in={s.k2 >= 2 || undefined}>
                  RM200
                </div>
                <div className="rv-up rv-pop" data-in={s.k2 >= 3 || undefined}>
                  ke atas*
                </div>
                <img
                  className="rv-card__kaftan rv-pop"
                  data-in={s.k2 >= 4 || undefined}
                  src={kaftan}
                  alt=""
                />
                <div className="rv-free rv-pop" data-in={s.k2 >= 5 || undefined}>
                  FREE KAFTAN
                </div>
                <div className="rv-fine rv-pop" data-in={s.k2 >= 6 || undefined}>
                  *random design
                  <br />
                  *jumlah bayaran selepas voucher
                  <br />
                  *1 kaftan setiap order · stok terhad
                </div>
              </div>
            </div>

            {/* 3 cart */}
            <div className="rv-cart" data-on={s.scene === 3 || undefined}>
              <div className="rv-copy" data-in={s.k3 >= 1 || undefined}>
                <span className="rv-kicker">Payday Sale · 25–30 Nov</span>
                <div className="rv-title">
                  Cukupkan RM200, <span className="rv-hl">kaftan</span> auto masuk 🎁
                </div>
              </div>
              <div className="rv-phonewrap" data-in={s.k3 >= 1 || undefined}>
                <Phone width={361} frame="pro">
                  <div className="rv-app">
                    <Row
                      pad={10}
                      lead={
                        <span className="rv-thumb" style={{ backgroundImage: `url(${photo})` }} />
                      }
                      title="Dahliah Mom Kurung"
                      meta={money(ITEM1)}
                    />
                    <Collapse open={added} reveal="drop">
                      <Row
                        pad={10}
                        lead={<span className="rv-thumb rv-thumb--filler" />}
                        title={<Bar w={120} h={9} tone={3} />}
                        meta={money(ITEM2)}
                      />
                    </Collapse>
                    <div className="rv-nudge" data-done={s.k3 >= 3 || undefined}>
                      <States
                        value={s.k3 >= 3 ? "done" : "short"}
                        align="start"
                        states={{
                          short: (
                            <div className="rv-nudge__text">
                              Tambah <b>{money(GOAL - ITEM1)}</b> lagi, dapat <b>FREE KAFTAN</b> 🎁
                            </div>
                          ),
                          done: (
                            <div className="rv-nudge__text">
                              Cukup RM200! <b>Kaftan percuma</b> dah masuk 🎉
                            </div>
                          ),
                        }}
                      />
                      <Meter
                        value={Math.min(1, total / GOAL)}
                        tone={s.k3 >= 3 ? "success" : "accent"}
                        className="rv-meter"
                      />
                    </div>
                    <div className="rv-giftrow" data-on={s.k3 >= 4 || undefined}>
                      <Row
                        pad={10}
                        lead={<img className="rv-gift" src={kaftan} alt="" />}
                        title="Kaftan percuma"
                        subtitle="*random design"
                        meta={
                          <States
                            value={s.k3 >= 4 ? "free" : "locked"}
                            align="end"
                            states={{
                              locked: <Badge tone="neutral">Belum cukup</Badge>,
                              free: <Badge tone="success">Percuma</Badge>,
                            }}
                          />
                        }
                      />
                    </div>
                    <div className="rv-total">
                      <span>Jumlah bayaran</span>
                      <Count className="rv-total__n" value={total} format={money} duration={800} />
                    </div>
                    <Button variant="primary" size="large" className="rv-buy">
                      Checkout
                    </Button>
                  </div>
                </Phone>
              </div>
            </div>

            {/* 4 kaftan */}
            <div className="rv-solo" data-on={s.scene === 4 || undefined}>
              <img
                className="rv-solo__kaftan"
                data-in={s.k4 >= 1 || undefined}
                src={kaftan}
                alt=""
              />
              <div className="rv-solo__free" data-in={s.k4 >= 2 || undefined}>
                FREE KAFTAN 🎁
              </div>
              <div className="rv-solo__rule" data-in={s.k4 >= 3 || undefined}>
                bila jumlah bayaran RM200 ke atas
              </div>
              <div className="rv-solo__fine" data-in={s.k4 >= 4 || undefined}>
                *selepas voucher · *random design
                <br />
                *1 kaftan setiap order · stok terhad
              </div>
            </div>

            {/* 5 live */}
            <div className="rv-end" data-on={s.scene === 5 || undefined}>
              <div className="rv-end__top" data-in={s.k5 >= 1 || undefined}>
                <span>Roselle RTW</span>
                <span>25–30 NOV</span>
              </div>
              <div className="rv-end__a" data-in={s.k5 >= 2 || undefined}>
                masuk
              </div>
              <div className="rv-end__b" data-in={s.k5 >= 3 || undefined}>
                LIVE
              </div>
              <div className="rv-end__c" data-in={s.k5 >= 4 || undefined}>
                sekarang.
              </div>
              <div className="rv-end__pill" data-in={s.k5 >= 5 || undefined}>
                komen berat, tinggi &amp; ukuran dada
              </div>
            </div>
          </>
        );
      }}
    </Stage>
  );
}
