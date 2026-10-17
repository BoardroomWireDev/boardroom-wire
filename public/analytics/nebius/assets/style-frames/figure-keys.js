/* The figure keys the heroes draw, with the credit name each prints under and, for a range row, the rule that reads its ends
   from the row's own note or quote. Read by gen-figures.js (the style frames' sf-figures.js). The built boards read shared/data.js,
   which Davinci derives from the same ledger (13 Oct). A key here must be a ledger row; the generators fail otherwise. */
const N = 'Nebius', NL2 = 'Nebius Q2 2026 shareholder letter', Q2K = 'Nebius Q2 2026 6-K', SA = 'StockAnalysis', BW = '';
const num = (s) => +String(s).replace(/,/g, '');
const RANGE = {
  // "Range 40,000,000 to 50,000,000" / "range 800-1,000 MW" / "Range: low 11869700000, high 16869700000" / "Range 50 to 60"
  note: (r) => { const m = (r.note || '').match(/[Rr]ange:?\s*(?:low\s*)?([\d,\.]+)\s*(?:to|-|,\s*high)\s*([\d,\.]+)/); return m && [num(m[1]), num(m[2])]; },
  // "$7 billion to $9 billion"
  quoteB: (r) => { const m = (r.quote || '').match(/\$(\d+(?:\.\d+)?) billion to \$(\d+(?:\.\d+)?) billion/); return m && [num(m[1]) * 1e9, num(m[2]) * 1e9]; },
  // "extended from four to five years": before and after
  fromTo: (r) => { const W = { two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7 }; const m = (r.quote || '').match(/from (\w+) to (\w+) years/);
    return m && W[m[1]] && W[m[2]] && [W[m[1]], W[m[2]]]; }
};
const K = [
  ['H1: the split'],
  ['yandex_sale_agreed_date', 'Yandex 6-K'], ['yandex_russia_sale_price_usd', 'Yandex 6-K'],
  ['yandex_russia_sale_discount_min', 'Yandex 6-K'], ['yandex_russia_sale_theoretical_value_calc', BW],
  ['nebius_divestment_cash_proceeds_2024_calc', BW], ['nebius_debt_31_dec_2024', 'Nebius 20-F (FY2024)'],
  ['nebius_headcount_at_split_2024', 'Nebius 6-K (15 Jul 2024)'], ['nebius_trading_resumed_date', 'Nebius 20-F (FY2025)'],
  ['HK: the cold open (16 Oct): the giant drawn as 100 parts, at least 95 sold'],
  ['yandex_russia_share_of_revenue_divested', 'Yandex 6-K'], ['nvidia_nebius_investment_march_2026', 'Nebius 6-K (11 Mar 2026)'],
  ['nebius_finland_capacity_before_2024_calc', BW],
  ['H4: 172 ways to fail'],
  ['nvidia_xid_error_count', 'Nvidia Xid catalog'],
  ['H5 and H9: Microsoft'],
  ['microsoft_nebius_contract_value', 'Nebius 6-K (8 Sep 2025)'], ['microsoft_nebius_contract_value_max', 'Nebius 6-K (8 Sep 2025)'],
  ['nebius_vineland_gb300_count', 'Bloomberg'], ['nebius_market_cap_8_september_2025', 'TheStreet'],
  ['nebius_share_price_change_after_microsoft_calc', BW], ['microsoft_upfront_payments_nebius', 'Nebius 20-F (FY2025)'],
  ['microsoft_revenue_per_year_calc', BW],
  ['H6: Meta'],
  ['meta_nebius_contract_nov_2025', 'Nebius 6-K (12 Nov 2025)'], ['meta_nebius_contract_mar_2026_max', 'Nebius 6-K (16 Mar 2026)'],
  ['meta_nebius_contract_mar_2026_firm', 'Nebius 6-K (16 Mar 2026)'], ['meta_nebius_contract_mar_2026_safety_net', 'Nebius 6-K (16 Mar 2026)'],
  ['meta_deal_multiple_calc', BW], ['nebius_backlog_august_2026', NL2],
  ['H7: the run'],
  ['nebius_gaap_revenue_year_ended_31_dec_2024', 'Nebius 20-F (FY2024)'], ['nebius_gaap_revenue_fy_2025', N],
  ['nebius_gaap_revenue_q1_2026', N], ['nebius_gaap_revenue_q2_2026', N], ['nebius_gaap_revenue_h1_2026_calc', BW],
  ['nebius_annualized_run_rate_march_2025', N], ['nebius_annualized_run_rate_june_2025', N],
  ['nebius_annualized_run_rate_september_2025', N], ['nebius_annualized_run_rate_december_2025', N],
  ['nebius_annualized_run_rate_march_2026', N], ['nebius_annualized_run_rate_june_2026', N],
  ['nebius_annualized_run_rate_ye2026_target_maintained', 'Nebius Q4 2025 shareholder letter', 'quoteB'],
  ['H8: power'],
  ['nebius_power_capacity_december_2025', N], ['nebius_power_capacity_may_2026', N],
  ['nebius_connected_power_target_year_end_2026', 'Nebius Q4 2025 shareholder letter', 'note'],
  ['nebius_capacity_deployment_per_year_from_2027', NL2],
  ['nebius_revenue_per_mw_2026_base', NL2], ['nebius_revenue_per_mw_q2_deals', NL2],
  ['nebius_revenue_per_mw_short_term', NL2, 'note'], ['nebius_vineland_mw', 'Nebius (5 Mar 2025)'],
  ['nebius_revenue_per_gw_calc', BW], ['nebius_revenue_2gw_calc', BW],
  ['H10: the burn'],
  ['nebius_net_loss_q2_2026', Q2K], ['nebius_operating_cash_flow_h1_2026', Q2K], ['nebius_deferred_revenue_change_h1_2026', Q2K],
  ['nebius_operating_cash_ex_prepayments_h1_2026_calc', BW], ['nebius_capex_h1_2026', Q2K],
  ['nebius_burn_h1_2026_calc', BW], ['nebius_burn_q2_2026_calc', BW],
  ['H11: the stock'],
  ['nebius_placement_price_dec_2024', 'Nebius 6-K (2 Dec 2024)'], ['nebius_share_price_high_date', 'Yahoo Finance'],
  ['nebius_share_price_9_october_2026', SA], ['nebius_market_cap_9_october_2026_calc', BW],
  ['nebius_annualized_run_rate_june_2026', N], ['burry_nebius_short_price_6_august_2026', 'Stocktwits'],
  ['nebius_share_price_change_12_august_2026', BW], ['nebius_share_price_daily_from_relisting', 'Yahoo Finance'],
  ['H12: the bear case'],
  ['trendforce_rubin_ramp_delayed_2027_september_2026', 'TrendForce'], ['nebius_server_useful_life_change_2026', 'Nebius 20-F (FY2025)', 'fromTo'],
  ['nebius_older_gpu_pricing_change_q2_2026', NL2], ['nebius_share_price_12_october_2026', SA],
  ['nebius_notes_conversion_price_march_2026', 'Nebius 6-K (17 Mar 2026)'], ['nebius_prepayment_build_cover_pct', NL2, 'note']
];
module.exports = { K, RANGE, num };
