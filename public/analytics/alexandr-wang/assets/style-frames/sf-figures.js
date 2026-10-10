/* Style frames, alexandr-wang: every figure a frame draws, by its ledger key. GENERATED from 02-research\ledger.json
   (258 rows, read 2026-10-08); do not edit by hand: node gen-figures.js.
   v, u, t, asOf, on and src are the ledger's value, unit, tier, as_of, date and source_name, verbatim: scaling and printing happen
   in the frames (sf.js fmt). Added here only: cr, the credit name; label, an on-screen name. At build these come from
   shared\data.js under the same keys. */
const FIG = {
  // H1: the capex race (cash purchases of property and equipment, calendar years)
  capex_amzn_2024: {"v":82999000000,"u":"USD","t":"P","asOf":"2024-12-31","on":"2026-02-05","src":"Amazon Q4 2025 earnings release"},
  capex_amzn_2025: {"v":131819000000,"u":"USD","t":"P","asOf":"2025-12-31","on":"2026-02-05","src":"Amazon Q4 2025 earnings release"},
  capex_googl_2024: {"v":52535000000,"u":"USD","t":"P","asOf":"2024-12-31","on":"2026-02-04","src":"Alphabet Q4 and fiscal year 2025 earnings release"},
  capex_googl_2025: {"v":91447000000,"u":"USD","t":"P","asOf":"2025-12-31","on":"2026-02-04","src":"Alphabet Q4 and fiscal year 2025 earnings release"},
  capex_msft_cy2024_calc: {"v":55552000000,"u":"USD","t":"C","asOf":"2024-12-31","on":"2026-10-05","src":"Our arithmetic from Microsoft cash flow statements (FY25 Q4, FY25 Q2)","cr":"Microsoft converted to calendar years"},
  capex_msft_cy2025_calc: {"v":83094000000,"u":"USD","t":"C","asOf":"2025-12-31","on":"2026-10-05","src":"Our arithmetic from Microsoft cash flow statements (FY25 Q4, FY26 Q2)","cr":"Microsoft converted to calendar years"},
  capex_meta_cash_2024: {"v":37256000000,"u":"USD","t":"P","asOf":"2024-12-31","on":"2026-01-28","src":"Meta Q4 and full-year 2025 earnings release"},
  capex_meta_cash_2025: {"v":69691000000,"u":"USD","t":"P","asOf":"2025-12-31","on":"2026-01-28","src":"Meta Q4 and full-year 2025 earnings release"},
  // H1: the April 2025 edition of the index (names as Artificial Analysis spells them)
  aa_apr2025_o4_mini_high: {"v":69.83,"u":"AA Intelligence Index (7-eval version, live Apr-Jun 2025)","t":"E","asOf":"2025-04-21","on":"2025-04-21","src":"Artificial Analysis home page, Wayback snapshot 21 Apr 2025 (embedded model data)","cr":"Artificial Analysis, 21 Apr 2025","label":"o4-mini (high)"},
  aa_apr2025_gemini25pro: {"v":67.84,"u":"AA Intelligence Index (7-eval version, live Apr-Jun 2025)","t":"E","asOf":"2025-04-21","on":"2025-04-21","src":"Artificial Analysis home page, Wayback snapshot 21 Apr 2025 (embedded model data)","cr":"Artificial Analysis, 21 Apr 2025","label":"Gemini 2.5 Pro Preview"},
  aa_apr2025_deepseek_r1: {"v":60.22,"u":"AA Intelligence Index (7-eval version, live Apr-Jun 2025)","t":"E","asOf":"2025-04-21","on":"2025-04-21","src":"Artificial Analysis home page, Wayback snapshot 21 Apr 2025 (embedded model data)","cr":"Artificial Analysis, 21 Apr 2025","label":"DeepSeek R1"},
  aa_apr2025_claude37_sonnet_thinking: {"v":57.39,"u":"AA Intelligence Index (7-eval version, live Apr-Jun 2025)","t":"E","asOf":"2025-04-21","on":"2025-04-21","src":"Artificial Analysis home page, Wayback snapshot 21 Apr 2025 (embedded model data)","cr":"Artificial Analysis, 21 Apr 2025","label":"Claude 3.7 Sonnet (Extended Thinking)"},
  aa_apr2025_deepseek_v3_0324: {"v":53.24,"u":"AA Intelligence Index (7-eval version, live Apr-Jun 2025)","t":"E","asOf":"2025-04-21","on":"2025-04-21","src":"Artificial Analysis home page, Wayback snapshot 21 Apr 2025 (embedded model data)","cr":"Artificial Analysis, 21 Apr 2025","label":"DeepSeek V3 0324"},
  aa_apr2025_gpt41: {"v":52.63,"u":"AA Intelligence Index (7-eval version, live Apr-Jun 2025)","t":"E","asOf":"2025-04-21","on":"2025-04-21","src":"Artificial Analysis home page, Wayback snapshot 21 Apr 2025 (embedded model data)","cr":"Artificial Analysis, 21 Apr 2025","label":"GPT-4.1"},
  aa_apr2025_llama4_maverick: {"v":50.53,"u":"AA Intelligence Index (7-eval version, live Apr-Jun 2025)","t":"E","asOf":"2025-04-21","on":"2025-04-21","src":"Artificial Analysis home page, Wayback snapshot 21 Apr 2025 (embedded model data)","cr":"Artificial Analysis, 21 Apr 2025","label":"Llama 4 Maverick"},
  aa_apr2025_llama4_scout: {"v":42.99,"u":"AA Intelligence Index (7-eval version, live Apr-Jun 2025)","t":"E","asOf":"2025-04-21","on":"2025-04-21","src":"Artificial Analysis home page, Wayback snapshot 21 Apr 2025 (embedded model data)","cr":"Artificial Analysis, 21 Apr 2025","label":"Llama 4 Scout"},
  aa_gap_maverick_vs_frontier_apr2025: {"v":19.3,"u":"AA Intelligence Index points","t":"C","asOf":"2025-04-21","on":"2026-10-05","src":"Our arithmetic on AA snapshot 21 Apr 2025","cr":""},
  aa_gap_maverick_vs_deepseek_v3_0324: {"v":2.71,"u":"AA Intelligence Index points","t":"C","asOf":"2025-04-21","on":"2026-10-05","src":"Our arithmetic on AA snapshot 21 Apr 2025","cr":""},
  // H2: the Scale deal
  scale_valuation_floor: {"v":29000000000,"u":"USD","t":"P","asOf":"2025-06-12","on":"2025-06-12","src":"Scale AI press release","cr":"Scale AI, 12 Jun 2025"},
  scale_deal_total_reported: {"v":14300000000,"u":"USD","t":"R","asOf":"2025-06-13","on":"2025-06-13","src":"Reuters (via ARY News)","cr":"Reuters"},
  scale_deal_stake_reported: {"v":49,"u":"percent","t":"R","asOf":"2025-06-13","on":"2025-06-13","src":"Reuters (via ARY News)","cr":"Reuters"},
  meta_scale_booked_fy2025: {"v":13800000000,"u":"USD","t":"P","asOf":"2025-12-31","on":"2026-01-29","src":"Meta Platforms Form 10-K, FY2025","cr":"Meta Form 10-K, FY2025"},
  google_cuts_scale: {"v":200000000,"u":"USD (planned 2025 spend)","t":"R","asOf":"2025-06-14","on":"2025-06-14","src":"TechCrunch (citing Reuters)","cr":"Reuters"},
  wang_scale_founded_year: {"v":2016,"u":"year","t":"P","asOf":"2016-01-01","on":"2026-10-04","src":"Meta executive bio","cr":"Meta executive bio"},
  // H4: the April 2026 edition of the index
  aa_llama4_scout_apr2026: {"v":13,"u":"index points","t":"E","asOf":"2026-04-08","on":"2026-04-08","src":"Artificial Analysis","cr":"Artificial Analysis, 8 Apr 2026","label":"Llama 4 Scout"},
  aa_llama4_maverick_apr2026: {"v":18,"u":"index points","t":"E","asOf":"2026-04-08","on":"2026-04-08","src":"Artificial Analysis","cr":"Artificial Analysis, 8 Apr 2026","label":"Llama 4 Maverick"},
  aa_muse_spark_apr2026: {"v":52,"u":"index points","t":"E","asOf":"2026-04-08","on":"2026-04-08","src":"Artificial Analysis","cr":"Artificial Analysis, 8 Apr 2026","label":"Muse Spark"},
  aa_meta_is_back: {"v":"Meta is back in the AI race","u":"text","t":"E","asOf":"2026-04-08","on":"2026-04-08","src":"Artificial Analysis","cr":"Artificial Analysis, 8 Apr 2026","label":["Gemini 3.1 Pro Preview","GPT-5.4","Claude Opus 4.6"]},
  ratio_spark_vs_maverick_apr2026: {"v":2.89,"u":"ratio","t":"C","asOf":"2026-04-08","on":"2026-10-08","src":"Boardroom Wire calculation from aa_muse_spark_apr2026 and aa_llama4_maverick_apr2026","cr":""},
  llama4_release: {"v":"2025-04-05","u":"date","t":"P","asOf":"2025-04-05","on":"2025-04-05","src":"Meta AI blog","cr":"Meta AI blog"},
  muse_spark_open_future: {"v":"hope to open-source future versions","u":"text","t":"P","asOf":"2026-04-08","on":"2026-04-08","src":"Meta newsroom","cr":"Meta newsroom"},
  // H5: how Muse works
  muse_secure_vm: {"v":"own cloud computer with a browser","u":"text","t":"P","asOf":"2026-09-08","on":"2026-09-08","src":"Meta newsroom","cr":"Meta newsroom","label":"Muse Secure VM"},
  muse_browser_forms: {"v":"opens a browser, fills forms, negotiates","u":"text","t":"P","asOf":"2026-09-08","on":"2026-09-08","src":"Meta newsroom","cr":"Meta newsroom","label":"browser"},
  muse_openclaw_reuters: {"v":"modeled on OpenClaw","u":"text","t":"R","asOf":"2026-09-08","on":"2026-09-08","src":"Reuters (via Khaleej Times)","cr":"Reuters"},
  // H6 and H9: reach and price
  meta_dap_jun2026: {"v":3600000000,"u":"daily active people","t":"P","asOf":"2026-06-30","on":"2026-07-29","src":"Meta Q2 2026 earnings release","cr":"Meta Q2 2026 earnings release"},
  muse_free_tier: {"v":"free for most of what people need","u":"text","t":"P","asOf":"2026-09-08","on":"2026-09-08","src":"Meta newsroom","cr":"Meta newsroom","label":"free tier"},
  grokbot_plans: {"v":"paid plans only","u":"text","t":"P","asOf":"2026-08-26","on":"2026-08-11","src":"SpaceXAI","cr":"SpaceXAI","label":"paid plans only"},
  dots_plans: {"v":"ChatGPT Pro and Business Premium","u":"text","t":"P","asOf":"2026-09-29","on":"2026-09-29","src":"OpenAI","cr":"OpenAI","label":"Pro and Business Premium"},
  // H7: Number One (tracker estimates)
  muse_rank_0910: {"v":2,"u":"rank (US App Store Top Charts, iPhone)","t":"E","asOf":"2026-09-10","on":"2026-09-10","src":"TechCrunch (Sensor Tower data)","cr":"Sensor Tower via TechCrunch"},
  muse_ios_early: {"v":83000,"u":"downloads (US iOS)","t":"E","asOf":"2026-09-10","on":"2026-09-10","src":"TechCrunch (Sensor Tower data)","cr":"Sensor Tower via TechCrunch"},
  muse_top_ios_free: {"v":"#1 US iOS free app","u":"text","t":"E","asOf":"2026-09-18","on":"2026-09-21","src":"CNBC (Sensor Tower data)","cr":"Sensor Tower via CNBC"},
  muse_downloads_5days: {"v":730000,"u":"downloads","t":"E","asOf":"2026-09-13","on":"2026-09-21","src":"CNBC (Sensor Tower data)","cr":"Sensor Tower via CNBC"},
  muse_downloads_0921: {"v":2500000,"u":"downloads","t":"E","asOf":"2026-09-21","on":"2026-09-21","src":"CNBC (Sensor Tower data)","cr":"Sensor Tower via CNBC"},
  meta_stock_0921: {"v":741.25,"u":"USD per share","t":"R","asOf":"2026-09-21","on":"2026-09-21","src":"The Next Web","cr":"The Next Web","chg":11.34},
  meta_stock_0921_pct: {"v":11.3,"u":"percent","t":"C","asOf":"2026-09-21","on":"2026-10-08","src":"Boardroom Wire calculation (META daily closes, Yahoo Finance chart data)","cr":""},
  // H8: the face of it
  wang_muse_posts_5days: {"v":100,"u":"posts","t":"R","asOf":"2026-09-13","on":"2026-10-04","src":"VnExpress (citing Business Insider)","cr":"Business Insider"},
  wang_muse_posts: {"v":350,"u":"posts","t":"R","asOf":"2026-09-27","on":"2026-10-04","src":"VnExpress (citing Business Insider)","cr":"Business Insider"},
  wang_x_followers: {"v":765900,"u":"followers","t":"P","asOf":"2026-10-04","on":"2026-10-04","src":"Alexandr Wang on X","cr":"X, 4 Oct 2026"},
  // H9: three agents
  grokbot_launch: {"v":"2026-08-11","u":"date","t":"P","asOf":"2026-08-11","on":"2026-08-11","src":"SpaceXAI","cr":"SpaceXAI"},
  muse_launch: {"v":"2026-09-08","u":"date","t":"P","asOf":"2026-09-08","on":"2026-09-08","src":"Meta newsroom","cr":"Meta newsroom"},
  dots_launch: {"v":"2026-09-29","u":"date","t":"P","asOf":"2026-09-29","on":"2026-09-29","src":"OpenAI","cr":"OpenAI"},
  gap_grokbot_to_muse_days: {"v":28,"u":"days","t":"C","asOf":"2026-09-08","on":"2026-10-08","src":"Boardroom Wire calculation from grokbot_launch and muse_launch","cr":""},
  gap_muse_to_dots_days: {"v":21,"u":"days","t":"C","asOf":"2026-09-29","on":"2026-10-08","src":"Boardroom Wire calculation from muse_launch and dots_launch","cr":""},
  grokbot_weekly_users: {"v":418000,"u":"weekly users","t":"R","asOf":"2026-09-14","on":"2026-09-22","src":"AI Weekly (citing Bloomberg)","cr":""},
  // H11: the bill
  meta_capex_guide_2026_jul_low: {"v":130000000000,"u":"USD","t":"P","asOf":"2026-12-31","on":"2026-07-29","src":"Meta Q2 2026 earnings release","cr":"Meta Q2 2026 earnings release"},
  meta_capex_guide_2026_jul_high: {"v":145000000000,"u":"USD","t":"P","asOf":"2026-12-31","on":"2026-07-29","src":"Meta Q2 2026 earnings release","cr":"Meta Q2 2026 earnings release"},
  meta_expense_guide_2026_jul: {"v":165000000000,"u":"USD","t":"P","asOf":"2026-12-31","on":"2026-07-29","src":"Meta Q2 2026 earnings release (CFO Outlook Commentary)","cr":"Meta Q2 2026 earnings release","vh":169000000000},
  meta_capex_2024: {"v":39230000000,"u":"USD","t":"P","asOf":"2024-12-31","on":"2025-01-29","src":"Meta Q4 2024 earnings release","cr":"Meta Q4 2024 earnings release"},
  meta_capex_2025: {"v":72220000000,"u":"USD","t":"P","asOf":"2025-12-31","on":"2026-01-28","src":"Meta Platforms Form 10-K, FY2025","cr":"Meta Form 10-K, FY2025"},
  meta_revenue_q2_2026: {"v":60800000000,"u":"USD","t":"P","asOf":"2026-06-30","on":"2026-07-29","src":"Meta Q2 2026 earnings release","cr":"Meta Q2 2026 earnings release"},
  meta_ocf_q2_2026: {"v":31860000000,"u":"USD","t":"P","asOf":"2026-06-30","on":"2026-07-29","src":"Meta Q2 2026 earnings release","cr":"Meta Q2 2026 earnings release"},
  meta_capex_q2_2026: {"v":31080000000,"u":"USD","t":"P","asOf":"2026-06-30","on":"2026-07-29","src":"Meta Q2 2026 earnings release","cr":"Meta Q2 2026 earnings release"},
  meta_fcf_q2_2026: {"v":784000000,"u":"USD","t":"P","asOf":"2026-06-30","on":"2026-07-29","src":"Meta Q2 2026 earnings release","cr":"Meta Q2 2026 earnings release"},
  meta_close_0918: {"v":665.75,"u":"USD per share","t":"P","asOf":"2026-09-18","on":"2026-09-28","src":"META daily closes (Yahoo Finance chart data, held in the Research Terminal price history)","cr":"Yahoo Finance"},
  meta_rev_consensus_fy2026: {"v":254100000000,"u":"USD","t":"E","asOf":"2026-12-31","on":"2026-10-08","src":"StockAnalysis (data: S&P Global Market Intelligence)","cr":"S&P Global Market Intelligence via StockAnalysis, 8 Oct 2026","label":"S&P Global"},
};
