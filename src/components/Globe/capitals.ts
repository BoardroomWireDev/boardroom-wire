/**
 * The tech capitals on the homepage globe, and the routes between them.
 *
 * Cities and copy are carried over unchanged from the globe.gl version (21 cities, house
 * voice, 18–26 Sep 2026). `EDGES` replaces its random arcs: each route is a real dependency
 * in the AI stack — silicon (tools → fabs → memory), compute (fabs → clouds → labs → sites)
 * or capital (who funds whom) — so a pulse means something. Shared with the Blender plate
 * via scripts/build-globe-data.mjs when the plate is rebuilt from the same data.
 */
export type Capital = {
  name: string; code: string; exchange: string; role: string; thesis: string;
  tz: string; lat: number; lng: number;
};

export const CAPITALS: Capital[] = [
  { name: 'New York',      code: 'NYC', exchange: 'NYSE',     role: 'Capital flows',         thesis: 'Every AI balance sheet gets priced here.',                  tz: 'America/New_York',    lat:  40.7128, lng:  -74.0060 },
  { name: 'San Francisco', code: 'SFO', exchange: 'Nasdaq',   role: 'Compute & code',        thesis: 'Frontier labs and term sheets, blocks apart.',              tz: 'America/Los_Angeles', lat:  37.7749, lng: -122.4194 },
  { name: 'Seattle',       code: 'SEA', exchange: 'Nasdaq',   role: 'Hyperscale capex',      thesis: 'Two balance sheets, most of the world\'s cloud.',           tz: 'America/Los_Angeles', lat:  47.6062, lng: -122.3321 },
  { name: 'Abilene',       code: 'ABI', exchange: 'Stargate', role: 'Compute buildout',      thesis: 'AI capex, measured in gigawatts and concrete.',             tz: 'America/Chicago',     lat:  32.4487, lng:  -99.7331 },
  { name: 'Toronto',       code: 'YYZ', exchange: 'TSX',      role: 'Quiet AI capital',      thesis: 'Deep learning\'s academic home, still exporting founders.', tz: 'America/Toronto',     lat:  43.6532, lng:  -79.3832 },
  { name: 'São Paulo',     code: 'GRU', exchange: 'B3',       role: 'LatAm tech',            thesis: 'Latin America\'s deepest engineering bench.',               tz: 'America/Sao_Paulo',   lat: -23.5505, lng:  -46.6333 },
  { name: 'London',        code: 'LON', exchange: 'LSE',      role: 'Cross-border capital',  thesis: 'The desk that prices risk before New York wakes.',          tz: 'Europe/London',       lat:  51.5074, lng:   -0.1278 },
  { name: 'Eindhoven',     code: 'EIN', exchange: 'AEX',      role: 'EUV monopoly',          thesis: 'One company. Every advanced chip. No substitute.',          tz: 'Europe/Amsterdam',    lat:  51.4416, lng:    5.4697 },
  { name: 'Frankfurt',     code: 'FRA', exchange: 'FWB',      role: 'EU underwriting',       thesis: 'Europe writes its infrastructure checks here.',             tz: 'Europe/Berlin',       lat:  50.1109, lng:    8.6821 },
  { name: 'Zurich',        code: 'ZRH', exchange: 'SIX',      role: 'Private capital',       thesis: 'Discretion, leverage, and a quiet compute allocation.',     tz: 'Europe/Zurich',       lat:  47.3769, lng:    8.5417 },
  { name: 'Riyadh',        code: 'RUH', exchange: 'Tadawul',  role: 'Sovereign compute',     thesis: 'Oil revenue, converted into GPUs.',                         tz: 'Asia/Riyadh',         lat:  24.7136, lng:   46.6753 },
  { name: 'Dubai',         code: 'DXB', exchange: 'DFM',      role: 'Sovereign capital',     thesis: 'The Gulf\'s trading floor for what Abu Dhabi funds.',       tz: 'Asia/Dubai',          lat:  25.2048, lng:   55.2708 },
  { name: 'Abu Dhabi',     code: 'AUH', exchange: 'ADX',      role: 'Sovereign AI',          thesis: 'A wealth fund buying compute at state scale.',              tz: 'Asia/Dubai',          lat:  24.4539, lng:   54.3773 },
  { name: 'Bengaluru',     code: 'BLR', exchange: 'Infosys',  role: 'Engineering bench',     thesis: 'Every hyperscaler\'s second engineering floor.',            tz: 'Asia/Kolkata',        lat:  12.9716, lng:   77.5946 },
  { name: 'Singapore',     code: 'SIN', exchange: 'SGX',      role: 'Switching center',      thesis: 'Neutral ground when both blocs need one.',                  tz: 'Asia/Singapore',      lat:   1.3521, lng:  103.8198 },
  { name: 'Hong Kong',     code: 'HKG', exchange: 'HKEX',     role: 'East-West gate',        thesis: 'The last desk where both systems still clear.',             tz: 'Asia/Hong_Kong',      lat:  22.3193, lng:  114.1694 },
  { name: 'Hangzhou',      code: 'HGH', exchange: 'SSE',      role: 'China\'s frontier lab', thesis: 'DeepSeek proved frontier models could run cheap.',          tz: 'Asia/Shanghai',       lat:  30.2741, lng:  120.1551 },
  { name: 'Shanghai',      code: 'PVG', exchange: 'SSE',      role: 'China capital',         thesis: 'Listings, licenses, and the state\'s hand on both.',        tz: 'Asia/Shanghai',       lat:  31.2304, lng:  121.4737 },
  { name: 'Taipei',        code: 'TPE', exchange: 'TWSE',     role: 'Advanced foundry',      thesis: 'Every frontier chip starts on one island.',                 tz: 'Asia/Taipei',         lat:  25.0330, lng:  121.5654 },
  { name: 'Seoul',         code: 'ICN', exchange: 'KRX',      role: 'Memory + foundry',      thesis: 'No HBM, no accelerator. The whole stack waits.',            tz: 'Asia/Seoul',          lat:  37.5665, lng:  126.9780 },
  { name: 'Tokyo',         code: 'TYO', exchange: 'TSE',      role: 'AI capex bed',          thesis: 'SoftBank\'s balance sheet, levered to the buildout.',       tz: 'Asia/Tokyo',          lat:  35.6762, lng:  139.6503 },
];

export type EdgeKind = 'silicon' | 'compute' | 'capital';
/** [from code, to code, kind] */
export const EDGES: Array<[string, string, EdgeKind]> = [
  // silicon: the tools, the fabs, the memory
  ['EIN', 'TPE', 'silicon'], ['EIN', 'ICN', 'silicon'], ['ICN', 'TPE', 'silicon'],
  ['TPE', 'HKG', 'silicon'], ['TPE', 'SIN', 'silicon'],
  // compute: chips to clouds, clouds to labs, labs to sites
  ['TPE', 'SFO', 'compute'], ['TPE', 'SEA', 'compute'], ['TPE', 'ABI', 'compute'],
  ['SEA', 'SFO', 'compute'], ['SFO', 'ABI', 'compute'], ['BLR', 'SEA', 'compute'],
  ['YYZ', 'SFO', 'compute'], ['HGH', 'PVG', 'compute'], ['SIN', 'BLR', 'compute'],
  ['LON', 'SFO', 'compute'],
  // capital: who funds the buildout
  ['NYC', 'SFO', 'capital'], ['NYC', 'LON', 'capital'], ['LON', 'FRA', 'capital'],
  ['ZRH', 'NYC', 'capital'], ['TYO', 'ABI', 'capital'], ['TYO', 'SFO', 'capital'],
  ['AUH', 'SFO', 'capital'], ['RUH', 'ABI', 'capital'], ['DXB', 'LON', 'capital'],
  ['GRU', 'NYC', 'capital'], ['HKG', 'PVG', 'capital'], ['FRA', 'ZRH', 'capital'],
];
