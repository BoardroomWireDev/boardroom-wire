/* H7 pair (alexandr-wang, Ive, 10 Oct 2026): the world both boards share and the camera shots. 06 ends on END06 and 07 opens on it,
   so the cut between them is a matched join: the same floor, the same rail and day numbers, the same camera. September 2026 day d
   sits at x = (d - 8) * 160; the rail is z = 0 on the floor (y = 0). Camera: cx, cy, cz, yaw and pitch in degrees (pitch > 0 looks
   down). Shots that hold a capture keep the pitch near 0, so its face stays a true rectangle. */
const H7 = (() => {
  const DX = 160, X = (d) => (d - 8) * DX;
  const c = (cx, cy, cz, pitch = 0, yaw = 0) => ({ cx, cy, cz, pitch, yaw });
  const END06 = c(1780, 400, -1420, 1);
  return {
    DX, X, END06,
    SHOT07: {
      open: c(1400, 430, -1560, 2),
      record: c(2600, 640, -720, 14, -60), recordb: c(260, 430, -460, 12, -56),
      mid: c(1150, 640, -1650, 12, 8), fwd: c(1300, 560, -900, 11, 40), fwdb: c(1500, 520, -1000, 10, 32),
      lands: c(1650, 520, -1000, 10, 28), landsb: c(1700, 516, -965, 10, 27)
    },
    SHOT06: {
      in10a: c(X(10), 285, -980, 0), in10b: c(X(10), 280, -880, 0),
      pair: c(960, 290, -1520, 0), pairb: c(985, 285, -1460, 0),
      in18a: c(X(18), 285, -970, 0), in18b: c(X(18), 280, -885, 0),
      dl: c(1600, 440, -1700, 0), dlb: c(1640, 420, -1620, 0), dlc: c(1650, 418, -1585, 0)
    }
  };
})();
