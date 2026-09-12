# Dental Nation Marketing Knowledge Graph
## Source document for knowledge graph / knowledge base construction

Prepared: 11 September 2026
Prepared by: ZAVIS
Subject: Dental Nation (Dubai, UAE) marketing infrastructure, channels, assets and strategy

---

## 1. Purpose of this document

This document consolidates everything currently known about the Dental Nation marketing system into a form that can be loaded into a knowledge graph or knowledge base. It is organised as:

1. Source registry (where each fact comes from)
2. Ontology (node types, edge types, property schema)
3. Node definitions (every entity, with properties and source references)
4. Relationship list (explicit subject, predicate, object triples)
5. Derived facts, constraints and open questions
6. Suggested loading order and graph queries

Every node has a stable ID in `snake_case`. Every relationship references those IDs. Source references use the codes in Section 2.

---

## 2. Source registry

| Code | Source | Type | Notes |
|---|---|---|---|
| S1 | Marketing OS delivery summary (two-month build report) | Internal document | Describes the seven components of the Marketing OS delivered by ZAVIS for Dental Nation |
| S2 | Dental Nation Performance Marketing Plan (PDF) | Internal document | Two-month paid acquisition pilot for Dubai, routed to Al Wasl |
| S3 | https://www.dentalnation.com/sitemap-knowledge.xml | Public URL | English knowledge sitemap (programmatic SEO pages) |
| S4 | https://www.dentalnation.com/sitemap-knowledge-ar.xml | Public URL | Arabic knowledge sitemap |
| S5 | https://dentalnation.com/sitemap-knowledge.xml | Public URL | Same sitemap on the non-www host (see Section 5, constraint C1) |
| S6 | https://w3layouts.com/dental-nation-case-study-dental-website-design-dubai/ | Public URL | W3Layouts case study, published 5 September 2026 |
| S7 | https://www.dentalnation.com/en/ads/Teeth-Whitening-Dubai | Public URL | Live paid landing page for performance ads |
| S8 | Off-page SEO strategy note | Internal note | PR via Digital 24, publishing on the W3Layouts blog, ZAVIS case studies, all for backlinks |
| S9 | Performance marketing strategy note | Internal note | Confirms S2 as the active performance marketing strategy |

---

## 3. Ontology

### 3.1 Node types

| Type ID | Label | Description |
|---|---|---|
| `Organisation` | Organisation | Companies, agencies, vendors, cloud providers |
| `Person` | Person | Named individuals |
| `Clinic` | Clinic branch | Physical Dental Nation locations |
| `Platform` | Platform / module | A software system or module within the Marketing OS |
| `Channel` | Marketing channel | Where marketing content or ads are delivered |
| `Asset` | Marketing asset | Concrete produced items: pages, segments, creatives, sitemaps, backlinks |
| `Campaign` | Campaign / programme | A time-bound or ongoing marketing initiative |
| `Strategy` | Strategy / approach | A method or principle governing how marketing is done |
| `Goal` | Goal / metric | An objective or the measure used to judge success |
| `Offer` | Commercial offer | A packaged treatment or promotion |
| `ContentCategory` | Content category | A category of programmatic SEO page |
| `Infrastructure` | Infrastructure | Cloud environments, servers, environments |
| `Phase` | Timeline phase | A stage in a campaign timeline |
| `Document` | Document | A source document or published article |

### 3.2 Edge types (predicates)

| Predicate | Meaning | Direction |
|---|---|---|
| `OWNS` | Subject owns or is the client for the object | Org → anything |
| `BUILT` | Subject designed, developed or delivered the object | Org/Person → Platform/Asset/Document |
| `DEPLOYED_ON` | Subject runs on the object | Platform/Asset → Infrastructure/Org |
| `PART_OF` | Subject is a component of the object | Platform → Platform |
| `INTEGRATES_WITH` | Subject exchanges data with the object | Platform ↔ Platform |
| `PRODUCES` | Subject generates the object | Platform/Person → Asset |
| `USES` | Subject consumes the object as input | Platform/Campaign → Asset |
| `TARGETS` | Subject is aimed at the object | Campaign/Channel → Clinic/Segment |
| `DELIVERS_TO` | Subject sends content through the object | Platform/Asset → Channel |
| `ROUTES_TO` | Leads or conversations from subject go to the object | Channel/Campaign → Clinic/Platform |
| `WORKED_IN` | Leads from subject are handled inside the object | Clinic/Channel → Platform |
| `FEEDS_BACK_TO` | Subject sends optimisation signal to the object | Platform/Strategy → Channel |
| `SUPPORTS_GOAL` | Subject contributes to the object goal | anything → Goal |
| `MEASURED_BY` | Subject is judged by the object | Campaign → Goal |
| `HAS_BUDGET` | Subject has a monetary allocation (property on edge) | Campaign/Channel → Budget value |
| `HAS_PHASE` | Subject contains the object phase | Campaign → Phase |
| `PRECEDES` | Subject happens before the object | Phase → Phase |
| `LINKS_TO` | Subject contains a hyperlink to the object (backlink) | Document/Asset → Asset |
| `PUBLISHED_BY` | Subject was published by the object | Document → Org |
| `LOCATED_IN` | Subject is physically in the object place | Clinic → Place |
| `IN_LANGUAGE` | Subject is written in the object language | Asset/Campaign → Language |
| `CONTAINS` | Subject includes the object as content | Asset → ContentCategory/Asset |
| `EMPLOYS` | Subject has the object as a team member or contractor | Org → Person |
| `TRIALLED` | Subject ran a trial with the object person for a role | Org/Platform → Person |
| `HAS_STATUS` | Subject is currently in the object state | anything → Status value |
| `FOLLOWS_STRATEGY` | Subject is governed by the object strategy | Campaign/Platform → Strategy |
| `DESCRIBED_IN` | Subject is documented in the object | anything → Document |

### 3.3 Standard node properties

Every node carries: `id`, `type`, `label`, `description`, `sources` (list of source codes), and optional `url`, `status`, `date`, `quantity`, `currency`, `language`.

---

## 4. Node definitions

### 4.1 Organisations

#### `dental_nation`
- Type: Organisation
- Label: Dental Nation
- Description: One of the fastest-growing dental clinic chains in Dubai. Multi-location group covering general and family dentistry, implants, Invisalign and clear aligners, veneers and Hollywood smile makeovers, teeth whitening, root canal, wisdom tooth removal and emergency dental care with same-day appointments. Brand line: "Beyond Smiles". Stated ambition: become the GCC's leading branded oral-health platform. Footer brand promise: "Premium dental care in the UAE, trusted, transparent, and results you can smile about."
- URL: https://dentalnation.com/en
- Industry: Healthcare, dental
- Location: Dubai, UAE
- Contact number used on site and ads: +971 55 277 2311 (call and WhatsApp)
- Social: Facebook, Instagram (@dentalnationuae), TikTok (@dentalnation_uae), LinkedIn (dental-nations), X (@Dental__Nation)
- Google rating shown on landing page: 4.9
- Licensing shown on landing page: DHA licensed
- Sources: S1, S2, S6, S7

#### `zavis`
- Type: Organisation
- Label: ZAVIS
- Description: Built, tested and deployed the Marketing OS for Dental Nation over two months. Operates the performance marketing pilot. All calls and messages from paid campaigns are worked in ZAVIS, and lead quality is tagged in ZAVIS. Also publishes case studies used as backlink sources.
- Role: Marketing technology and operations partner
- Sources: S1, S2, S8

#### `w3layouts`
- Type: Organisation
- Label: W3Layouts
- Description: Web design and development company. Built the Dental Nation website: UX strategy, web design, front-end development, booking system integration, bilingual (EN/AR) build and SEO architecture. Published a public case study about the project on 5 September 2026. Its blog is a backlink source in the off-page SEO plan.
- URL: https://w3layouts.com/
- Sources: S6, S8

#### `digital_24`
- Type: Organisation
- Label: Digital 24
- Description: PR and digital publishing partner. Named in the off-page SEO strategy as the outlet for PR articles that generate backlinks to dentalnation.com.
- Sources: S8

#### `microsoft_azure`
- Type: Organisation (also acts as Infrastructure provider)
- Label: Microsoft Azure
- Description: Cloud provider hosting the Marketing OS. Virtual servers were provisioned and configured, and production plus development environments were set up.
- Sources: S1

#### `google`
- Type: Organisation
- Label: Google
- Description: Ad platform for Strategy A (Google Search). Receives lead-quality feedback from ZAVIS.
- Sources: S2

#### `meta`
- Type: Organisation
- Label: Meta
- Description: Ad platform for Strategy B (Instagram and Facebook Click-to-WhatsApp). Receives lead-quality feedback from ZAVIS.
- Sources: S2

### 4.2 People

#### `hashi`
- Type: Person
- Label: Hashi
- Description: Creative resource considered for the Content Creator and Video Editor role (healthcare content creation, video editing, AI-assisted content production). Completed a trial. Did not work out; not continuing.
- Status: Trial completed, not continuing
- Sources: S1

#### `dental_nation_leadership`
- Type: Person (group)
- Label: Dental Nation leadership team
- Description: Quoted in the W3Layouts case study endorsing the website build.
- Sources: S6

### 4.3 Clinics

#### `clinic_al_wasl`
- Type: Clinic
- Label: Dental Nation, Al Wasl branch
- Description: Primary branch and routing destination for all performance marketing leads. Al Wasl phone numbers and tracking are connected to ZAVIS in week 1 of the pilot.
- URL: https://www.dentalnation.com/en/clinics/al-wasl
- Status: Open
- Sources: S2, S6, S7

#### `clinic_dr_tosun`
- Type: Clinic
- Label: Dental Nation, Dr Tosun branch
- URL: https://www.dentalnation.com/en/clinics/dr-tosun
- Status: Open
- Sources: S6, S7

#### `clinic_amc`
- Type: Clinic
- Label: Dental Nation, AMC branch
- URL: https://www.dentalnation.com/en/clinics/amc
- Status: Open
- Sources: S6, S7

### 4.4 Platforms and modules (the Marketing OS)

#### `marketing_os`
- Type: Platform
- Label: Marketing OS
- Description: A unified, scalable, AI-driven marketing infrastructure designed, developed and deployed for Dental Nation over two months. Brings together patient intelligence, content production, creative generation, programmatic SEO and marketing operations into one ecosystem supporting personalised patient engagement and long-term organic growth.
- Build duration: 2 months
- Components: Patient Intelligence Platform, Creative Studio, Content OS, Programmatic SEO Platform, Cloud Infrastructure and Deployment, Smile Club implementation, Video Content Production and Marketing Operations
- Sources: S1

#### `patient_intelligence_platform`
- Type: Platform
- Label: Patient Intelligence Platform (PIP)
- Description: The intelligence layer of the Marketing OS. Designed, developed, tested and deployed. Serves as the central source of truth for audience segmentation, enabling personalised campaigns based on patient behaviour, treatment history, demographics and engagement patterns.
- Key deliverables:
  - APIs to retrieve patient records
  - APIs to retrieve patient segmentation data
  - 25 patient audience segments for WhatsApp broadcast campaigns
  - 80 audience segments for performance marketing campaigns
  - Campaign strategy and creative recommendation for every segment
  - Deployed on Microsoft Azure
- Segmentation dimensions: patient behaviour, treatment history, demographics, engagement patterns
- Status: Deployed
- Sources: S1

#### `creative_studio`
- Type: Platform
- Label: Creative Studio
- Description: Automates creative production for marketing campaigns. Integrated with the Patient Intelligence Platform.
- Capabilities:
  - Retrieve patient segments directly from the PIP
  - Select any audience segment and campaign objective
  - Automatically generate personalised static creatives for WhatsApp broadcast campaigns
  - Rapidly produce campaign-ready assets with minimal manual design effort
- Outcome: Targeted WhatsApp campaigns can be created in minutes with consistent messaging.
- Output format: Static creatives
- Status: Deployed
- Sources: S1

#### `content_os`
- Type: Platform
- Label: Content OS
- Description: Structured system for continuous content production across multiple marketing channels, supporting organic marketing and thought leadership.
- Capabilities:
  - Weekly educational content planning
  - Research-driven healthcare articles
  - LinkedIn content creation
  - Website content production
  - Reusable content frameworks for patient education
  - Content workflows for organic marketing and thought leadership
- Cadence: Weekly planning
- Status: Established
- Sources: S1

#### `programmatic_seo_platform`
- Type: Platform
- Label: Programmatic SEO Platform
- Description: Large-scale platform that expands Dental Nation's organic search presence through automated generation of highly targeted landing pages. Uses reusable content archetypes and structured templates to generate thousands of SEO-optimised pages across patient search intent.
- Total pages managed: more than 14,000
- Content categories (planned scope): Patient Questions, Treatment Guides, Condition Guides, Symptom Guides, Treatment Comparisons, Materials, Dental Technologies, Dentist Profiles, Dentist Directory, Cost and Pricing Guides, Clinical Tools, Educational Content, Arabic Localised Content
- Status: Live
- Sources: S1, S3, S4

#### `cloud_infrastructure`
- Type: Platform / Infrastructure
- Label: Cloud Infrastructure and Deployment
- Description: The cloud foundation supporting the Marketing OS.
- Completed activities:
  - Created Microsoft Azure cloud infrastructure
  - Provisioned and configured Azure virtual servers
  - Deployed the Patient Intelligence Platform
  - Deployed the latest version of the Dental Nation website
  - Configured production environments for future AI and content generation services
  - Created and deployed a dedicated development environment for the website (feature development, testing, release management)
- Status: Deployed
- Sources: S1

#### `smile_club`
- Type: Platform / Campaign (loyalty programme)
- Label: Smile Club
- Description: Dental Nation loyalty programme. Implemented end to end based on provided business requirements, including the complete customer journey. Deployed on the Dental Nation development website. Benefits described publicly: priority booking, exclusive pricing, complimentary annual check-ups across every branch. Reframes the relationship from a single visit to long-term care.
- Public URL: http://smileclub.dentalnation.com
- Status: Deployed on development environment
- Sources: S1, S6, S7

#### `video_content_production`
- Type: Platform / Capability
- Label: Video Content Production and Marketing Operations
- Description: Scalable video content production capability. Output supports educational videos, social media content, LinkedIn content, promotional campaigns and other multimedia assets in the Marketing OS content pipeline. A creative resource (Hashi) was trialled for the role; the trial did not work out and the role is open.
- Status: Role open, resource to be replaced
- Sources: S1

### 4.5 Infrastructure environments

#### `azure_production_env`
- Type: Infrastructure
- Label: Azure production environment
- Description: Production environment configured to support future AI and content generation services. Hosts the PIP and the live website.
- Sources: S1

#### `azure_development_env`
- Type: Infrastructure
- Label: Azure development environment
- Description: Dedicated development environment for the Dental Nation website, supporting ongoing feature development, testing and release management. Smile Club is deployed here.
- Sources: S1

### 4.6 Channels

#### `channel_whatsapp_broadcast`
- Type: Channel
- Label: WhatsApp broadcast
- Description: Owned channel for segment-targeted broadcast campaigns using 25 PIP segments and creatives generated by the Creative Studio.
- Sources: S1

#### `channel_google_search`
- Type: Channel
- Label: Google Search ads (Strategy A)
- Description: Paid search. Ten new landing pages built from keyword and market research, not from the current site. A new offer on each page, written for paid traffic. Four pages carry ads at a time (spreading budget across ten would tell nothing about any of them).
- Budget: AED 3,000 month 1, AED 3,000 month 2, AED 6,000 total
- Sources: S2

#### `channel_meta_ctwa`
- Type: Channel
- Label: Meta Click-to-WhatsApp (Strategy B)
- Description: Instagram and Facebook ads that open a WhatsApp chat with Al Wasl directly. Separate English and Arabic campaigns, each written natively. Described as the fastest route from ad to live conversation and the cheapest channel in this market.
- Budget: AED 3,000 month 1, AED 3,000 month 2, AED 6,000 total
- Platforms: Instagram, Facebook
- Sources: S2

#### `channel_linkedin`
- Type: Channel
- Label: LinkedIn
- Description: Thought-leadership channel fed by the Content OS and the video/content pipeline.
- Sources: S1

#### `channel_website`
- Type: Channel / Asset
- Label: dentalnation.com
- Description: Bilingual (EN/AR), booking-first, concern-led website built by W3Layouts. Hosts the programmatic SEO pages, the journal, signature offers, clinic network hub, dentist profiles and booking widget. Deployed on Azure by ZAVIS (latest version).
- URL: https://dentalnation.com/en (also served on https://www.dentalnation.com)
- Main navigation: Book, Manage, Experience, Reason to Visit, Treatments, Smile Club, Our Network, Help
- Key features: persistent emergency bar ("Pain? Same-day care"), one-tap call and WhatsApp, Emergency Book shortcut, EN/AR switch, booking widget on homepage and every offer, self-service retrieve/reschedule/cancel/online check-in, clinic locator, testimonials tagged by specialty and dentist, DN Pay, insurance partners page
- Sources: S1, S6, S7

#### `channel_journal`
- Type: Channel / Asset
- Label: The Dental Nation Journal
- Description: Patient education blog surfaced as a three-card strip on the homepage. Owned channel for long-tail search. Topics seen: preventive check-ups, link between oral and overall health, whitening.
- Sources: S6

#### `channel_social_video`
- Type: Channel
- Label: Social media and video content
- Description: Educational videos, social media posts, promotional multimedia produced through the video content pipeline. Dental Nation social handles: Instagram @dentalnationuae, TikTok @dentalnation_uae, Facebook, LinkedIn, X.
- Sources: S1, S7

### 4.7 Assets

#### `segments_whatsapp_25`
- Type: Asset
- Label: 25 WhatsApp broadcast audience segments
- Quantity: 25
- Description: Patient audience segments created in the PIP for WhatsApp broadcast campaigns. Each segment has a campaign strategy and creative recommendation.
- Sources: S1

#### `segments_performance_80`
- Type: Asset
- Label: 80 performance marketing audience segments
- Quantity: 80
- Description: Audience segments created in the PIP for performance marketing campaigns. Each segment has a campaign strategy and creative recommendation.
- Sources: S1

#### `seo_pages_total`
- Type: Asset
- Label: Programmatic SEO page set
- Quantity: 14,000+ (sum of reported categories: 15,348)
- Description: The full set of programmatic SEO pages managed by the platform.
- Sources: S1, S3, S4

Programmatic SEO coverage by category (each is a `ContentCategory` node, `CONTAINS`-linked from `seo_pages_total`):

| Node ID | Category | Pages created |
|---|---|---|
| `seo_cat_patient_questions` | Patient Questions | 10,880 |
| `seo_cat_dentist_profiles` | Dentist Profiles | 3,451 |
| `seo_cat_treatments` | Treatments | 397 |
| `seo_cat_conditions` | Conditions | 147 |
| `seo_cat_dentist_directory` | Dentist Directory | 130 |
| `seo_cat_symptoms` | Symptoms | 119 |
| `seo_cat_materials` | Materials | 83 |
| `seo_cat_comparisons` | Comparisons | 79 |
| `seo_cat_technology` | Technology | 62 |

Additional planned categories with no page count reported yet (create as `ContentCategory` nodes with `quantity: null`):
`seo_cat_cost_pricing` (Cost and Pricing Guides), `seo_cat_clinical_tools` (Clinical Tools), `seo_cat_educational` (Educational Content), `seo_cat_arabic_localised` (Arabic Localised Content).

#### `sitemap_knowledge_en`
- Type: Asset
- Label: Knowledge sitemap (English)
- URL: https://www.dentalnation.com/sitemap-knowledge.xml
- Alternate URL: https://dentalnation.com/sitemap-knowledge.xml
- Language: en
- Description: XML sitemap listing the English programmatic SEO knowledge pages.
- Sources: S3, S5

#### `sitemap_knowledge_ar`
- Type: Asset
- Label: Knowledge sitemap (Arabic)
- URL: https://www.dentalnation.com/sitemap-knowledge-ar.xml
- Language: ar
- Description: XML sitemap listing the Arabic localised programmatic SEO knowledge pages.
- Sources: S4

#### `paid_landing_pages_10`
- Type: Asset
- Label: Ten paid landing pages
- Quantity: 10 (4 active at any one time)
- Description: New landing pages for Google Search ads, built from keyword and competitor research decided in week 1. Each carries a new offer written for paid traffic. Separate from the existing website and its packages.
- Path pattern: /en/ads/{Theme}
- Sources: S2, S7

#### `lp_teeth_whitening_dubai`
- Type: Asset
- Label: Teeth Whitening Dubai landing page
- URL: https://www.dentalnation.com/en/ads/Teeth-Whitening-Dubai
- Language: en (og:locale en_AE, alternate ar_AE)
- Description: Live example of a paid landing page. Offer: free consultation plus 40% off the complete whitening package (general dentist exam and suitability check, scaling/cleaning/polish, one-hour in-chair Zoom whitening with gum protection, sensitivity monitoring and aftercare). Meta description quotes "from AED 2,199 all-in" and "we call you back within 15 minutes". Page promises replies in under 2 minutes, open 7 days, dentist-led, private consultation. CTAs: call +971 55 277 2311 and WhatsApp with a pre-filled offer message. Includes before/after result image, six-point "why whiten with Dental Nation" section, three-step visit, FAQ.
- Robots: noindex, nofollow, nocache (intentional for paid traffic; keeps it out of the organic index)
- Sources: S7

#### `signature_offers`
- Type: Offer (group)
- Label: Signature offers
- Description: Packaged treatments on the main website with upfront AED pricing. Six offers shown on the homepage. Note: the performance marketing plan states its paid offers are separate from these existing packages.
- Members (create as individual `Offer` nodes):
  - `offer_dn_first_look`: The DN First Look, welcome visit
  - `offer_dn_sos`: DN SOS "Seen in 60", emergency care
  - `offer_dn_glow_up`: The DN Glow Up, teeth whitening
  - `offer_dn_glow_up_couples`: DN Glow Up couples edition
  - `offer_dn_scan`: The DN Scan, orthodontics
  - `offer_dn_plan`: DN Plan, complimentary implant consultation
- Related: DN Pay (flexible payment), insurance partners page
- Sources: S6, S7

#### `backlink_w3layouts_case_study`
- Type: Document / Asset
- Label: W3Layouts case study: Dental Nation
- URL: https://w3layouts.com/dental-nation-case-study-dental-website-design-dubai/
- Published: 5 September 2026 (modified same day)
- Author: W3Layouts
- Description: Public case study titled "Dental Nation Case Study: Designing a Patient-First Dental Website for Dubai". Contains multiple do-follow style links to dentalnation.com pages (homepage, care journeys, concerns, dentists, clinics, offers, glow-up, insurance partners, experience pages). Serves as an off-page SEO backlink source. Tags: Case Study, Dental Website Design, Dubai, Healthcare Website, UX Strategy, Web Design.
- Linked dentalnation.com pages observed: /en, /en/care-journeys/restore, /en/care-journeys/align, /en/concerns/aesthetic-cosmetic, /en/glow-up, /en/concerns/wisdom-teeth, /en/care-journeys/sos, /en/care-journeys/family, /en/dentists, /en/experience/kids-visit-guide, /en/manage/comfort-anxiety-care, /en/experience/advanced-technology, /en/experience/dedicated-sterilization-room, /en/manage/online-check-in, /en/offers, /en/insurance-partners, /en/clinics
- Sources: S6, S8

#### `backlink_digital_24_pr`
- Type: Document / Asset
- Label: Digital 24 PR publications
- Description: PR articles to be published through Digital 24 as part of the off-page SEO strategy. Specific URLs not yet recorded.
- Status: Planned / in progress
- Sources: S8

#### `backlink_zavis_case_studies`
- Type: Document / Asset
- Label: ZAVIS case studies
- Description: Case studies published by ZAVIS that link to dentalnation.com, contributing backlinks. Specific URLs not yet recorded.
- Status: Planned / in progress
- Sources: S8

#### `creatives_whatsapp_static`
- Type: Asset
- Label: WhatsApp static creatives
- Description: Personalised static creatives auto-generated by the Creative Studio per segment and objective.
- Sources: S1

### 4.8 Campaigns

#### `campaign_performance_pilot`
- Type: Campaign
- Label: Performance Marketing Plan (paid acquisition pilot)
- Description: Two-month paid acquisition pilot for Dubai, routed to Al Wasl. A fresh paid build, separate from the existing website and its packages. Two channels run in parallel across eight weeks. Month 1 tests broadly; month 2 concentrates spend on the themes producing the best leads.
- Primary goal: Lead generation
- Media budget: AED 12,000 (media spend only; research, landing page build, creative production and campaign management quoted separately)
- Project period: 8 weeks
- Channels: Google Search, Meta Click-to-WhatsApp
- Languages: English, Arabic
- Routing: Al Wasl, via ZAVIS
- Budget table:

| Channel | Month 1 | Month 2 | Total |
|---|---|---|---|
| Google Search | AED 3,000 | AED 3,000 | AED 6,000 |
| Meta Click-to-WhatsApp | AED 3,000 | AED 3,000 | AED 6,000 |
| Total media spend | AED 6,000 | AED 6,000 | AED 12,000 |

- Sources: S2, S9

#### `campaign_whatsapp_broadcast`
- Type: Campaign
- Label: WhatsApp broadcast campaigns
- Description: Segment-driven broadcasts using the 25 PIP segments and Creative Studio output.
- Sources: S1

### 4.9 Phases (performance pilot timeline)

| Node ID | Phase | Weeks | What happens |
|---|---|---|---|
| `phase_week1_research_build` | Research and build | Week 1 | Keyword and competitor research decides the ten themes. Landing pages, offers and creative are built. Al Wasl numbers and tracking connected to ZAVIS. No spend. |
| `phase_month1_live` | Month 1 live | Weeks 2 to 4 | Both channels go live. Budget spread evenly across the four active themes and both languages to learn which generate quality leads. |
| `phase_month1_review` | Month 1 review | End of week 4 | Judged on volume and quality of leads per theme, offer and creative. Winners keep spending, weak themes are swapped out. |
| `phase_month2_final_review` | Month 2 and final review | Weeks 5 to 8 | Budget concentrated on the themes producing the best leads. Closing recommendation on whether to scale, hold or stop, with a month 3 budget. |

### 4.10 Strategies

#### `strategy_google_search`
- Type: Strategy
- Label: Strategy A: Google Search
- Description: Ten new landing pages from keyword and market research; new offer per page; four pages live at a time.
- Sources: S2

#### `strategy_meta_ctwa`
- Type: Strategy
- Label: Strategy B: Meta Click-to-WhatsApp
- Description: Instagram and Facebook ads opening a WhatsApp chat with Al Wasl; native EN and AR campaigns; fastest ad-to-conversation route and cheapest channel in this market.
- Sources: S2

#### `strategy_test_then_concentrate`
- Type: Strategy
- Label: Test broadly, then concentrate
- Description: Month 1 spreads budget evenly across four active themes and two languages. Month 1 review keeps winners and swaps weak themes. Month 2 concentrates spend on the best lead-producing themes.
- Sources: S2

#### `strategy_lead_quality_feedback`
- Type: Strategy
- Label: Lead quality feedback loop
- Description: Lead quality is tagged in ZAVIS and fed back into Google and Meta, so both platforms optimise toward better leads rather than the cheapest clicks.
- Sources: S2

#### `strategy_off_page_seo`
- Type: Strategy
- Label: Off-page SEO and PR
- Description: Backlink acquisition through three routes: PR publishing via Digital 24, publishing on the W3Layouts blog, and ZAVIS case studies.
- Sources: S8

#### `strategy_programmatic_seo`
- Type: Strategy
- Label: Programmatic SEO
- Description: Automated generation of thousands of SEO pages from content archetypes and templates to cover high-intent healthcare search queries at scale.
- Sources: S1

#### `strategy_bilingual`
- Type: Strategy
- Label: Bilingual English and Arabic
- Description: English and Arabic treated as first-class across the website (RTL layouts, typography, navigation designed in parallel), programmatic SEO (Arabic localised content and AR sitemap) and paid campaigns (native EN and AR Meta campaigns).
- Sources: S1, S2, S4, S6

#### `strategy_concern_first_architecture`
- Type: Strategy
- Label: Concern-first site architecture
- Description: Website organised around why people search (tooth pain, crooked teeth, stained teeth, wisdom teeth, missing teeth, dental anxiety) rather than departments. Each concern leads to a care journey. Mirrors both how patients think and how they search, giving a scalable base for search visibility.
- Care journeys: Emergency and Fast Access (SOS), Family and Routine, Lifestyle and Wellness, Implants and Full-Arch Rehab (Restore), Orthodontics and Aligner Aesthetics (Align), Repair Save and Restore, Gum Health and Long-Term Protection
- Concerns: General Oral Health, Teeth Alignment and Bite, Tooth Decay/Cavities/Abscesses, Bad Breath, Gum Disease, Aesthetic and Cosmetic, Tooth Loss and Replacement, Children's Oral Health, Wisdom Teeth, Jaw Pain and TMJ, Soft Tissue Lesions and Oral Cancers, Dental Anxiety
- Sources: S6, S7

#### `strategy_booking_as_spine`
- Type: Strategy
- Label: Booking as the spine of the site
- Description: Booking widget runs through the homepage and every offer, with a persistent Emergency shortcut, one-tap call and WhatsApp. Self-service retrieve, reschedule, cancel and online check-in.
- Sources: S6

#### `strategy_personalised_engagement`
- Type: Strategy
- Label: Personalised patient engagement
- Description: Campaigns targeted by patient behaviour, treatment history, demographics and engagement patterns, enabled by the PIP and Creative Studio.
- Sources: S1

### 4.11 Goals and metrics

#### `goal_lead_generation`
- Type: Goal
- Label: Lead generation (pilot primary goal)
- Description: Success is the volume of quality leads reaching Al Wasl and the cost of producing them.
- Sources: S2

#### `metric_quality_lead`
- Type: Goal (definition)
- Label: Quality lead definition
- Description: A quality lead is real, contactable, in catchment and has genuine treatment interest.
- Sources: S2

#### `goal_cost_per_booked_patient`
- Type: Goal
- Label: Conversion and cost per booked patient (next phase)
- Description: Becomes the measure in the next phase once consistent lead flow is established.
- Status: Deferred to next phase
- Sources: S2

#### `goal_organic_growth`
- Type: Goal
- Label: Long-term organic traffic growth
- Description: Served by programmatic SEO, the journal, Content OS and off-page backlinks.
- Sources: S1, S6, S8

#### `goal_thought_leadership`
- Type: Goal
- Label: Thought leadership
- Description: Served by the Content OS (LinkedIn, articles) and video content.
- Sources: S1

### 4.12 Documents

| Node ID | Label | Reference |
|---|---|---|
| `doc_marketing_os_summary` | Marketing OS delivery summary | S1 |
| `doc_performance_marketing_plan` | Dental Nation Performance Marketing Plan (PDF) | S2 |
| `doc_w3layouts_case_study` | W3Layouts case study (same as `backlink_w3layouts_case_study`) | S6 |
| `doc_offpage_seo_note` | Off-page SEO strategy note | S8 |

### 4.13 Reference values (create as literal nodes or properties)

- Languages: `lang_en` (English), `lang_ar` (Arabic)
- Places: `place_dubai` (Dubai, UAE), `place_uae`, `place_gcc`
- Currency: AED

---

## 5. Relationship list (triples)

Format: `subject | predicate | object | properties | sources`

### 5.1 Ownership and build

```
dental_nation | OWNS | marketing_os | | S1
dental_nation | OWNS | channel_website | | S6
dental_nation | OWNS | smile_club | | S1
dental_nation | OWNS | clinic_al_wasl | | S6
dental_nation | OWNS | clinic_dr_tosun | | S6
dental_nation | OWNS | clinic_amc | | S6
dental_nation | OWNS | signature_offers | | S6
dental_nation | OWNS | channel_journal | | S6
zavis | BUILT | marketing_os | duration=2 months | S1
zavis | BUILT | patient_intelligence_platform | | S1
zavis | BUILT | creative_studio | | S1
zavis | BUILT | content_os | | S1
zavis | BUILT | programmatic_seo_platform | | S1
zavis | BUILT | cloud_infrastructure | | S1
zavis | BUILT | smile_club | | S1
zavis | BUILT | video_content_production | | S1
zavis | BUILT | campaign_performance_pilot | | S2
zavis | BUILT | paid_landing_pages_10 | | S2
zavis | TRIALLED | hashi | status=trial_completed, outcome=not_continuing | S1
w3layouts | BUILT | channel_website | services=UX strategy, web design, front-end, booking integration, bilingual build, SEO architecture | S6
w3layouts | BUILT | backlink_w3layouts_case_study | date=2026-09-05 | S6
digital_24 | BUILT | backlink_digital_24_pr | status=planned | S8
zavis | BUILT | backlink_zavis_case_studies | status=planned | S8
```

### 5.2 Marketing OS structure

```
patient_intelligence_platform | PART_OF | marketing_os | | S1
creative_studio | PART_OF | marketing_os | | S1
content_os | PART_OF | marketing_os | | S1
programmatic_seo_platform | PART_OF | marketing_os | | S1
cloud_infrastructure | PART_OF | marketing_os | | S1
smile_club | PART_OF | marketing_os | | S1
video_content_production | PART_OF | marketing_os | | S1
creative_studio | INTEGRATES_WITH | patient_intelligence_platform | direction=pulls segments | S1
patient_intelligence_platform | PRODUCES | segments_whatsapp_25 | quantity=25 | S1
patient_intelligence_platform | PRODUCES | segments_performance_80 | quantity=80 | S1
creative_studio | USES | segments_whatsapp_25 | | S1
creative_studio | PRODUCES | creatives_whatsapp_static | | S1
creatives_whatsapp_static | DELIVERS_TO | channel_whatsapp_broadcast | | S1
segments_whatsapp_25 | TARGETS | channel_whatsapp_broadcast | | S1
segments_performance_80 | USED_BY | campaign_performance_pilot | | S1
content_os | DELIVERS_TO | channel_linkedin | | S1
content_os | DELIVERS_TO | channel_website | | S1
content_os | DELIVERS_TO | channel_journal | | S1, S6
programmatic_seo_platform | PRODUCES | seo_pages_total | quantity=14000+ | S1
seo_pages_total | CONTAINS | seo_cat_patient_questions | quantity=10880 | S1
seo_pages_total | CONTAINS | seo_cat_dentist_profiles | quantity=3451 | S1
seo_pages_total | CONTAINS | seo_cat_treatments | quantity=397 | S1
seo_pages_total | CONTAINS | seo_cat_conditions | quantity=147 | S1
seo_pages_total | CONTAINS | seo_cat_dentist_directory | quantity=130 | S1
seo_pages_total | CONTAINS | seo_cat_symptoms | quantity=119 | S1
seo_pages_total | CONTAINS | seo_cat_materials | quantity=83 | S1
seo_pages_total | CONTAINS | seo_cat_comparisons | quantity=79 | S1
seo_pages_total | CONTAINS | seo_cat_technology | quantity=62 | S1
seo_pages_total | CONTAINS | seo_cat_cost_pricing | quantity=null | S1
seo_pages_total | CONTAINS | seo_cat_clinical_tools | quantity=null | S1
seo_pages_total | CONTAINS | seo_cat_educational | quantity=null | S1
seo_pages_total | CONTAINS | seo_cat_arabic_localised | quantity=null | S1
seo_pages_total | HOSTED_ON | channel_website | | S1, S3
sitemap_knowledge_en | CONTAINS | seo_pages_total | language=en | S3
sitemap_knowledge_ar | CONTAINS | seo_cat_arabic_localised | language=ar | S4
sitemap_knowledge_en | IN_LANGUAGE | lang_en | | S3
sitemap_knowledge_ar | IN_LANGUAGE | lang_ar | | S4
video_content_production | TRIALLED | hashi | status=trial_completed, outcome=not_continuing | S1
video_content_production | PRODUCES | channel_social_video | | S1
video_content_production | PRODUCES | channel_linkedin | | S1
```

### 5.3 Infrastructure

```
cloud_infrastructure | DEPLOYED_ON | microsoft_azure | | S1
patient_intelligence_platform | DEPLOYED_ON | microsoft_azure | | S1
patient_intelligence_platform | DEPLOYED_ON | azure_production_env | | S1
channel_website | DEPLOYED_ON | azure_production_env | note=latest version deployed by ZAVIS | S1
smile_club | DEPLOYED_ON | azure_development_env | | S1
azure_production_env | PART_OF | cloud_infrastructure | | S1
azure_development_env | PART_OF | cloud_infrastructure | | S1
```

### 5.4 Performance marketing pilot

```
campaign_performance_pilot | FOLLOWS_STRATEGY | strategy_google_search | | S2
campaign_performance_pilot | FOLLOWS_STRATEGY | strategy_meta_ctwa | | S2
campaign_performance_pilot | FOLLOWS_STRATEGY | strategy_test_then_concentrate | | S2
campaign_performance_pilot | FOLLOWS_STRATEGY | strategy_lead_quality_feedback | | S2
campaign_performance_pilot | FOLLOWS_STRATEGY | strategy_bilingual | | S2
campaign_performance_pilot | USES | channel_google_search | | S2
campaign_performance_pilot | USES | channel_meta_ctwa | | S2
campaign_performance_pilot | HAS_BUDGET | AED 12000 | scope=media only, period=8 weeks | S2
channel_google_search | HAS_BUDGET | AED 6000 | month1=3000, month2=3000 | S2
channel_meta_ctwa | HAS_BUDGET | AED 6000 | month1=3000, month2=3000 | S2
campaign_performance_pilot | IN_LANGUAGE | lang_en | | S2
campaign_performance_pilot | IN_LANGUAGE | lang_ar | | S2
channel_meta_ctwa | IN_LANGUAGE | lang_en | separate campaign | S2
channel_meta_ctwa | IN_LANGUAGE | lang_ar | separate campaign, written natively | S2
channel_google_search | USES | paid_landing_pages_10 | active_at_once=4 | S2
paid_landing_pages_10 | CONTAINS | lp_teeth_whitening_dubai | | S7
lp_teeth_whitening_dubai | HAS_STATUS | noindex_nofollow | | S7
channel_google_search | ROUTES_TO | clinic_al_wasl | | S2
channel_meta_ctwa | ROUTES_TO | clinic_al_wasl | via=WhatsApp | S2
lp_teeth_whitening_dubai | ROUTES_TO | clinic_al_wasl | via=call and WhatsApp +971 55 277 2311 | S2, S7
clinic_al_wasl | WORKED_IN | zavis | | S2
campaign_performance_pilot | ROUTES_TO | zavis | | S2
zavis | FEEDS_BACK_TO | channel_google_search | signal=lead quality tags | S2
zavis | FEEDS_BACK_TO | channel_meta_ctwa | signal=lead quality tags | S2
strategy_lead_quality_feedback | FEEDS_BACK_TO | google | | S2
strategy_lead_quality_feedback | FEEDS_BACK_TO | meta | | S2
campaign_performance_pilot | MEASURED_BY | goal_lead_generation | | S2
goal_lead_generation | DEFINED_BY | metric_quality_lead | | S2
campaign_performance_pilot | HAS_PHASE | phase_week1_research_build | weeks=1 | S2
campaign_performance_pilot | HAS_PHASE | phase_month1_live | weeks=2-4 | S2
campaign_performance_pilot | HAS_PHASE | phase_month1_review | | S2
campaign_performance_pilot | HAS_PHASE | phase_month2_final_review | weeks=5-8 | S2
phase_week1_research_build | PRECEDES | phase_month1_live | | S2
phase_month1_live | PRECEDES | phase_month1_review | | S2
phase_month1_review | PRECEDES | phase_month2_final_review | | S2
phase_month2_final_review | PRECEDES | goal_cost_per_booked_patient | note=next phase | S2
phase_week1_research_build | PRODUCES | paid_landing_pages_10 | | S2
campaign_performance_pilot | SEPARATE_FROM | signature_offers | note=fresh paid build, separate from existing packages | S2
campaign_performance_pilot | DESCRIBED_IN | doc_performance_marketing_plan | | S2
```

### 5.5 Off-page SEO and organic growth

```
strategy_off_page_seo | USES | backlink_w3layouts_case_study | | S8
strategy_off_page_seo | USES | backlink_digital_24_pr | | S8
strategy_off_page_seo | USES | backlink_zavis_case_studies | | S8
backlink_w3layouts_case_study | LINKS_TO | channel_website | pages=17 distinct dentalnation.com URLs | S6
backlink_w3layouts_case_study | PUBLISHED_BY | w3layouts | date=2026-09-05 | S6
backlink_digital_24_pr | LINKS_TO | channel_website | | S8
backlink_digital_24_pr | PUBLISHED_BY | digital_24 | | S8
backlink_zavis_case_studies | LINKS_TO | channel_website | | S8
backlink_zavis_case_studies | PUBLISHED_BY | zavis | | S8
strategy_off_page_seo | SUPPORTS_GOAL | goal_organic_growth | | S8
strategy_programmatic_seo | SUPPORTS_GOAL | goal_organic_growth | | S1
programmatic_seo_platform | FOLLOWS_STRATEGY | strategy_programmatic_seo | | S1
programmatic_seo_platform | FOLLOWS_STRATEGY | strategy_bilingual | | S1, S4
channel_journal | SUPPORTS_GOAL | goal_organic_growth | | S6
content_os | SUPPORTS_GOAL | goal_organic_growth | | S1
content_os | SUPPORTS_GOAL | goal_thought_leadership | | S1
video_content_production | SUPPORTS_GOAL | goal_thought_leadership | | S1
patient_intelligence_platform | SUPPORTS_GOAL | strategy_personalised_engagement | | S1
creative_studio | SUPPORTS_GOAL | strategy_personalised_engagement | | S1
channel_website | FOLLOWS_STRATEGY | strategy_concern_first_architecture | | S6
channel_website | FOLLOWS_STRATEGY | strategy_booking_as_spine | | S6
channel_website | FOLLOWS_STRATEGY | strategy_bilingual | | S6
channel_website | IN_LANGUAGE | lang_en | | S6
channel_website | IN_LANGUAGE | lang_ar | | S6
channel_website | CONTAINS | signature_offers | | S6, S7
channel_website | CONTAINS | channel_journal | | S6
channel_website | CONTAINS | smile_club | | S7
channel_website | DESCRIBED_IN | doc_w3layouts_case_study | | S6
```

### 5.6 Geography

```
dental_nation | LOCATED_IN | place_dubai | | S6
clinic_al_wasl | LOCATED_IN | place_dubai | area=Al Wasl | S6
clinic_dr_tosun | LOCATED_IN | place_dubai | | S6
clinic_amc | LOCATED_IN | place_dubai | | S6
campaign_performance_pilot | TARGETS | place_dubai | | S2
dental_nation | ASPIRES_TO_LEAD | place_gcc | note=GCC's leading branded oral-health platform | S6
```

---

## 6. Derived facts, constraints and open questions

### 6.1 Derived facts (inferred from sources, tag as `inferred`)

- D1. The paid acquisition cluster (pilot, landing pages, Google, Meta, Al Wasl, ZAVIS) and the organic cluster (programmatic SEO, sitemaps, journal, backlinks) are intentionally separate. The plan says the paid build is separate from the existing website and its packages, and the whitening page is noindex. (S2, S7)
- D2. ZAVIS sits at the junction of both clusters: it built the organic infrastructure and it operates the paid lead handling and feedback loop. (S1, S2)
- D3. The reported category counts sum to 15,348, above the "more than 14,000" headline, so the headline is a conservative round-down. (S1)
- D4. The 80 performance segments from the PIP are the natural audience input for Meta campaigns, though S2 does not explicitly say the pilot uses them. Mark this edge as `inferred`.
- D5. Video content production and the Content OS both feed LinkedIn, so LinkedIn has two producers. (S1)

### 6.2 Constraints and data-quality notes

- C1. Canonical host. The knowledge sitemap is referenced on both `www.dentalnation.com` and `dentalnation.com`. One host should be canonical, with the other 301-redirecting, otherwise search engines may treat them as two properties. Record `sitemap_knowledge_en` with one canonical URL and one alias.
- C2. Paid landing pages carry `noindex, nofollow, nocache`. This is correct and should be modelled as a property, not as a defect.
- C3. `backlink_digital_24_pr` and `backlink_zavis_case_studies` have no URLs yet. Create them as placeholder nodes with `status=planned` and fill in URLs when published.
- C4. Only one of the ten paid landing pages (Teeth Whitening Dubai) is currently known. The other nine themes are decided in week 1 and should be added as child nodes of `paid_landing_pages_10` when known.
- C5. The performance plan budget covers media only. Research, landing page build, creative production and campaign management are quoted separately and are not in the graph as monetary values.
- C6. Smile Club is deployed on the development website, not production. Model `HAS_STATUS = dev_deployed` and update when it goes live.
- C7. The Hashi trial did not work out. Keep the node for history with `status=trial_completed, outcome=not_continuing`, and treat the Content Creator and Video Editor role as open.

### 6.3 Open questions to resolve with the source owners

- Q1. Which nine additional themes/landing pages will Google Search use, and which four are active in month 1?
- Q2. Which of the 80 performance segments (if any) are being used as Meta audiences in the pilot?
- Q3. What are the URLs and publication dates for the Digital 24 PR pieces and the ZAVIS case studies?
- Q4. Which host (www or non-www) is canonical for dentalnation.com?
- Q5. When is Smile Club scheduled to move from the development environment to production?
- Q6. Who will fill the Content Creator and Video Editor role, and what is the intended cadence of video output?
- Q7. Are there WhatsApp broadcast campaign results (send volumes, response rates) to attach to `campaign_whatsapp_broadcast`?
- Q8. What are the Arabic page counts per category, so `seo_cat_arabic_localised` can carry a quantity?

---

## 7. Suggested loading order and example queries

### 7.1 Loading order

1. Reference nodes (languages, places, currency)
2. Organisations and people
3. Clinics
4. Platforms, infrastructure and the Marketing OS structure (Section 5.2, 5.3)
5. Assets and content categories
6. Channels
7. Campaigns, phases, strategies, goals (Section 5.4, 5.5)
8. Documents and `DESCRIBED_IN` edges
9. Inferred edges last, tagged `inferred=true`

### 7.2 Example questions the graph should answer

- What does ZAVIS own or operate versus what W3Layouts built?
- Which assets does a lead touch from a Meta ad to a tagged lead in ZAVIS?
- Which pages or documents currently provide backlinks to dentalnation.com, and who published them?
- How much media budget is allocated per channel per month, and what phase is the pilot in?
- What is the programmatic SEO page count per category and per language?
- Which strategies serve the organic growth goal versus the lead generation goal?
- Which items are in a non-final state (trial, planned, dev-only, coming soon)?

### 7.3 Suggested visual grouping

- Layer 1 (organisations): Dental Nation, ZAVIS, W3Layouts, Digital 24, Microsoft Azure, Google, Meta
- Layer 2 (Marketing OS modules): PIP, Creative Studio, Content OS, Programmatic SEO, Cloud Infrastructure, Smile Club, Video Production
- Layer 3 (channels): WhatsApp broadcast, Google Search, Meta Click-to-WhatsApp, LinkedIn, dentalnation.com, Journal, Social/video
- Layer 4 (assets): segments, SEO pages and categories, sitemaps, landing pages, offers, backlinks, creatives
- Layer 5 (strategies and goals): pilot plan, test-then-concentrate, lead quality loop, off-page SEO, bilingual, concern-first, personalised engagement, lead generation, organic growth
- Layer 6 (clinics and places): Al Wasl, Dr Tosun, AMC, Dubai

---

End of document.
