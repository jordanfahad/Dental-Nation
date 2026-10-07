# DN-010: revised video review

Reviewed 7 October 2026. This is an editorial readiness assessment for human review, not a sign-off.

Scope: the three named MP4 files in the task. All were present. The comparison reference is `lib/smileclub/scripts.ts`, including its `scriptsFor` output and `creative.ts` dependency, at local main commit `dc34932a5f321f9dc00f47dd827409d6616de1fb`. Those files were unchanged. The script file's status text was not treated as evidence of permission or sign-off.

**Review status: partial.** Neither Whisper nor faster-whisper is installed. Following the task's stated fallback, this review uses inspected frames, visible captions, container metadata and measured audio levels. Spoken sentence accuracy, subtitle-to-speech accuracy, pronunciation, echo, noise and music-to-voice balance remain unverified. The script comparisons below concern visible evidence, not a verified speech transcript.

## 1. Template verdict: not ready

`29sept-template shoot-Dr.Safwan-MJ.mp4` has usable clinical footage and recognisable Dental Nation branding, but it is not a reliable master for the other dentists yet. Its visible story differs substantially from Dr Safwan's reference concept, identification is missing from the inspected frames, several captions need correction, the final action is incomplete, and the audio exceeds full scale.

### Must-fix list

| Timestamp | Evidence | Revision needed |
| --- | --- | --- |
| 00:00-00:14.60 and 00:26.53-00:42.80 | The export follows a pain conversation and treatment montage. The reference is the monthly subscriptions story, including the phone list and teeth checkbox. | Resolve the script mismatch against the filmed reference before treating this as the shared template. A different script cannot be inferred to have permission from this export or the task's claims. |
| First dentist appearance, approximately 00:01-00:03 | No readable dentist name/title card was found in the inspected frames. | Include the reference identity: **Dr. M Safwan Sultan, General Dentist, Dental Nation Al Wasl**. A wall logo or embroidered coat is not an introduction card. |
| 00:00 | The opening wall wordmark is cut at both sides. | Start on a complete, readable wordmark or on the intended story hook. |
| 00:28.50 | The caption sits over the reclining subject's face; a large equipment arm also obscures the shot and the picture is soft. | Select a clearer shot and reposition this caption away from the face. |
| 00:36.00-00:38.00; 00:40.50-00:42.50 | Visible errors include `Don'T`, `Until Something Get Hurts`, and `Your Smile Deserves A Care Before The Pain`. | Correct the wording and sentence case against the intended script and actual speech. These are visible text defects; whether the audio contains the same errors has not been established. |
| 00:27.00-00:35.00 | Captions use general preventive care, urgent support and savings language. The reference's plan qualification and specific check-ups, cleaning and priority appointments are not reproduced in these inspected captions. | Restore the exact applicable offer wording in the intended script and captions. Do not silently replace specific benefits with general claims. |
| 00:46.80 and 00:47.30 samples | `All Year From` and `99 AED` appear before `Per Month`, which is present by the 00:47.80 sample. | Show the complete starting price and monthly unit together from the first price frame. The animation currently allows a misleading annual-price reading. |
| 00:48.80-00:53.23 | The closing card says Join / Smile Club / Dental Nation. No reception or WhatsApp action or contact detail appears in the inspected end-card sequence. | Restore the reference's reception/WhatsApp action and the verified contact route. Hold the complete information long enough to read on a phone. |
| Whole mix; strongest decoded peak at 00:05.082 | Integrated loudness is **-11.82 LUFS**; true peak is **+0.38 dBTP**. Decoded audio has 45 stereo sample frames above full scale, occurring between 00:05.082 and 00:22.998. | Rebalance and limit the export near the task's -14 LUFS target, with headroom below full scale. Re-measure the exported file. Audible distortion has not been assessed. |

### Current structure, with timestamps

These are observations of this cut, not recommended timings to copy unchanged. Shot boundaries come from detected scene changes; caption and card timings are sampled.

| Time | Current beat | Implication for the shared template |
| --- | --- | --- |
| 00:00-approximately 00:02 | Wall-logo reveal into reception | Cropped opening; the reference hook is absent. |
| Approximately 00:02-00:10.97 | Pain conversation at reception | Dentist appears without a readable identification card in the inspected frames. |
| 00:10.97-00:14.60 | Second angle and year-round-care caption | Large empty ceiling/headroom area; abrupt framing change. |
| 00:14.60-00:26.53 | Preparation and treatment montage | Roughly 12 seconds of montage before the visible Smile Club benefit sequence. |
| 00:26.53-00:35.73 | Treatment footage with membership captions | Offer wording differs from the reference; some captions and equipment cover the subject. |
| 00:35.73-00:38.50 | Response about waiting for pain | Caption grammar needs correction. |
| 00:38.50-00:42.80 | Dentist closing line | Readable brand board behind the dentist, but no identity card; closing caption needs correction. |
| 00:42.80-approximately 00:48.80 | White card builds title, benefit line, price and monthly unit | Complete price information arrives late and in separate steps. |
| Approximately 00:48.80-00:53.23 | Join card and wordmark | Brand is present; actionable contact route is absent. |

A reusable visual sequence would be the dentist's reference hook, exact name/title card, that dentist's script and offer, and a complete action/end card. The language and offer must remain dentist-specific. In particular, Sevinc's reference is educational and contains no price; Safwan's price card is not transferable to her cut.

## 2. Fahad's six comment items

The task attributes these comments and production updates to other people. Their attribution and reported completion status have not been independently verified.

| Item | Status in this batch | Evidence | What remains from Mohan |
| --- | --- | --- | --- |
| 1. Template first | Needs revision | Safwan's full cut was reviewed first. The timestamped issues above prevent readiness. | A corrected template, identified against the script reference, for Marketing's review before adapting the other edits. |
| 2. Safwan 26 Sep, Ali 26 Sep and Tosun 28 Sep re-edits | Not supplied or reviewed here | Those named re-edits are not among the three requested files. The task records a 7 Oct deadline and says they await the template; that does not prove their current production state. | The three re-edits, their source/template versions and an updated delivery status. |
| 3. Sevinc date, English and Turkish | Date label corrected to 5 Oct; English needs fixes; Turkish not found as a labeled delivery | File name is `05 Oct Dr.Sevinc-Eng.mp4`. Its container creation date is 5 Oct 2026, which is consistent with the label but does not prove filming date. The `(1)` copy has the same SHA-256, so it is a duplicate. | Revised English, a separately identified Turkish version, and full/15 s/6 s exports for each. The task's statement that Turkish has not started is unverified. |
| 4. Qasem B-roll and intended video | Selected cutaways usable; delivery set and assignment unclear | The named `3Oct Dr.Qasem (Broll shoot) 3.mp4` was inspected. A second, differently hashed file without the trailing `3` exists but was not visually reviewed. No third clearly named Qasem B-roll file is present. | A three-file manifest, the missing or differently named file, and the target video for each selection. The 7 Oct main shoot is a task-reported schedule, not a reviewed deliverable. |
| 5. Full + 15 s + 6 s, per language, with subtitles | Incomplete in the identified batch | The three video tracks are 53.23 s, 46.60 s and 49.27 s. All are 9:16, 30 fps. Safwan and Sevinc have burned-in English captions; Qasem's sampled B-roll has no dialogue captions. No clearly labeled 15 s/6 s or Turkish delivery was found. | A manifest and the missing language/length exports, with captions checked against speech. B-roll alone does not replace a finished, captioned main video. |
| 6. Consistent naming | Not met by any of the three supplied names | All omit several fields from `YYYY-MM-DD_DrName_VIDEO_LANG_LEN_vN`. The filenames' September/October dates agree with the task's labels, not independently established filming dates. | Consistent date, dentist, video/concept, language, length and version fields; distinguish source B-roll from finished films and remove duplicate ambiguity. |

For example, a verified English Sevinc full export could be named `2026-10-05_DrSevinc_V1-SmileClub_EN_FULL_v1.mp4`, with corresponding `_15s_`, `_6s_` and `_TR_` variants. This is a naming example, not an assertion that those files exist. None of the input files was renamed.

## 3. Additional issues and video-specific evidence

### Script comparison: visible changes, with the speech audit outstanding

The named reference functions were evaluated for the three dentists in English. Safwan and Qasem have English/Arabic reference languages; Sevinc has English/Turkish. The table does not certify any sentence as correctly spoken or absent from speech.

| Safwan reference unit | Visible evidence in the export |
| --- | --- |
| Subscription-list opening and voice-over | No phone/subscription list or teeth checkbox was found. Reception/pain captions occupy approximately 00:02-00:10.50. |
| Forgetting teeth despite remembering subscriptions | Replaced in the visible story by a pain-arrival exchange and pain/prevention replies, approximately 00:02-00:09. |
| Seeing the dentist only when something hurts; the higher cost then | The 00:06.50-00:09 captions retain a broad waiting-for-pain idea, but not the reference's cost statement. |
| Putting teeth on a plan; from AED 99 monthly; daily comparison | At 00:27-00:30 the captions instead describe dental care becoming a membership. The monthly price appears on the late card; the daily comparison was not found in the inspected text. |
| Plan-qualified check-ups, professional cleaning, priority appointments and member rates | At 00:30.50-00:35 the visible list is preventive care, urgent dental support and savings on eligible treatments. Urgent support is an addition to this assigned concept, although it appears in the repository's general offer text. The concept's exact qualification and named benefits are not reproduced. |
| Add teeth to the list; reception or WhatsApp action | No checkbox payoff was found. The final Join card lacks the reference's specific action. |

Additional visible dialogue not in Safwan's assigned concept appears at approximately 00:10-00:10.50 (what to do), 00:11.50-00:13.50 (stay connected throughout the year), 00:36-00:38 (waiting until something hurts), 00:39-00:40 (affirmation), and 00:40.50-00:42.50 (the closing care-before-pain line). These are descriptions of caption differences, not a speech transcript.

| Sevinc reference unit | Visible evidence in the export |
| --- | --- |
| Snoozed appointment reminder and counter; opening acknowledgement | No reminder/counter was found. At 00:01-00:05.50, the opening captions instead address an upcoming check-up and introducing something new. |
| Work, meetings, weekends; dentist always postponed | No corresponding lifestyle montage or caption was found. At 00:06-00:12, the captions discuss small problems, early detection and costs. |
| Smile Club does the planning | At 00:12.50-00:18, the visible copy instead describes getting dental care back on track all year. |
| Check-ups planned for the year and priority appointments fitting the week; calendar graphic | At 00:18.50-00:32, a longer benefits list appears, including a plan qualification, check-up, cleaning/help, urgent problems, priority appointment and eligible-treatment benefits. These overlap some general offer concepts but do not reproduce this sentence or its calendar graphic. |
| Stop snoozing your smile; Smile Club by Dental Nation; WhatsApp action | At 00:40.97-00:42.47, the caption asks the viewer to reply to the message and says the team will explain plans. The 00:43.67-00:46.60 end card has a Dental Nation logo/tagline, without the reference's Smile Club/WhatsApp action. The reply caption may suit direct messaging but does not supply a complete Reels/Stories action. |

Sevinc's lack of a price card is consistent with the current no-price reference for her branch. It should not be listed as a missing AED 99 offer.

### Sevinc: caption, picture and branding corrections

| Timestamp | Finding |
| --- | --- |
| 00:00-00:05.93 | No readable name/title introduction was found. The reference identity is **Dr. Sevinc Behruzoglu, General Dentist, Dr. Tosun Dental Clinic**. |
| 00:18.50-00:22 | Caption wording includes `Depending On The Plans` and `Regular Check Up`. Check the intended singular/plural wording and use consistent spelling and punctuation against the script and speech. |
| 00:22.50-00:27 | `Professional Cleaning Helps` is followed by `When You Have An Urgent Dental Problem`. The caption break can make these look like one claim rather than separate benefits. Correct the wording, punctuation and timing after listening. |
| 00:27.50-00:28.50 | The visible label is `Priority Appointment`, singular, while the reference uses plural appointments. |
| 00:41.97-00:42.47 | `And My Teams Will Explain The Plans` needs a check of `team` versus `teams`. The current reference does not contain this closing sentence. |
| 00:12.07-00:18.17 | A clinical-image monitor is prominent behind the dentist. It adds clutter; a neutral screen or a tighter composition would keep attention on the speaker. No displayed clinical information is reproduced in this review. |
| 00:32.03-00:37.67 | Warm preparation close-ups differ visibly from the cooler seated interview shots. Match the colour treatment when assembling the master style. |
| Whole file | The source export is 720 x 1280. Faces are generally distinguishable in the sampled frames, but this is lower resolution than the other two deliveries. A higher-resolution export should come from the original timeline/source, if available. Upscaling alone does not restore detail. |

The English captions are relatively large, usually over dark clothing and below the face, with a visible shadow. Safwan's captions are smaller and mix italics, title case and uneven line spacing. Both need a consistent caption style. The Safwan face overlap at 00:28.50 is a specific placement defect. A real phone preview, including platform interface overlays, was not performed.

### Qasem: cutaway suitability and limits

`3Oct Dr.Qasem (Broll shoot) 3.mp4` is a 49.27-second portrait montage. It contains usable selections, but the whole montage is not a replacement for the main script-led video.

| Time | Selection or issue | Suggested use |
| --- | --- | --- |
| 00:02.43-00:03.07 | Brief clinician preparation shot | Possible introductory cutaway, preferably with longer source handles. |
| 00:38.50-00:39.20 | Cleaner clinician close-up | Possible bridge within a doctor introduction or care explainer. |
| 00:41.73-00:43.13 | Mirror/explanation interaction | A stronger candidate for reassuring care context than the invasive instrument close-ups. |
| 00:44.50-approximately 00:45.30 | Seated consultation before the fade | Best match for a discussion or planned-care beat. Request a longer clean source shot if needed. |
| 00:00-00:02.43 | Black-and-white opener with several very short cuts, followed by colour | A deliberate-looking style change, but not a neutral template match. Use only if the chosen edit calls for it. |
| Approximately 00:05.73-00:08; 00:21.50-00:22.07; 00:25.17 | Strong lamp highlights, close treatment detail, and an obstructed view at 00:22.07 | Avoid using these as the reassuring opening for the reference gum-care concept. Some highlights lose visible detail. |
| 00:09.27-00:10.10; 00:22.07; 00:33.43-00:34 | Blur or foreground obstruction in sampled frames | Trim or choose clearer source sections. These frames do not establish whether the complete shot is steady. |
| 00:37.60-00:38.50 | Image viewer with a visible information strip | Exclude or crop/clear the information strip before reuse. No identifiers from it are reproduced here. |

The strongest match to Qasem's assigned Smile Club concept, **A little pink in the sink**, is a short consultation or clinician cutaway under his reference explanation. The required toothbrush/sink hook, name/title card, calendar, offer and main presentation are not supplied by this montage. His other reference concept, **Why wait for the toothache?**, would also need its own hook, comparison graphic and presentation. The procedure-heavy footage does not establish which of these was intended.

No dialogue subtitles or identification card were found in the inspected B-roll frames. That is acceptable for source cutaways; the finished language version still needs the appropriate captions and **Dr. Mohammad Qasem, Periodontist, Dental Nation Al Wasl** identification. This review did not establish whether the B-roll soundtrack contains speech, so no spoken-sentence comparison is claimed for it.

### Branding and picture across the batch

The Dental Nation serif wordmark and four-point mint mark are visually consistent with the local brand-book overview image. No other clinic's name or logo was identified in the sampled frames. This is a sampled observation, not a guarantee about every frame.

The mint corner mark becomes faint against bright walls, for example Safwan at 00:20 and Qasem at 00:38. Exact font families, colour values and full brand-book compliance cannot be established from the overview alone. Safwan's white end card and Sevinc's pale mint end card also differ; the master should settle the intended card treatment.

Safwan's wide reception shots around 00:06-00:12 leave substantial empty space above the speakers. The 00:14 transition crops the people tightly, and the 00:28.50 equipment arm blocks the subject. Skin and room colour vary between the warm reception and cooler clinical footage. Sevinc has largely clear seated framing, but the background and colour shift between setups. Qasem alternates dark backlit faces, strong lamp highlights and bright blue clothing. None of these still-frame observations verifies smooth motion, absence of jump cuts, or lip sync.

### Measured formats and sound

Durations below are video-track durations from ffprobe. Container durations are 53.242993, 46.601995 and 49.272993 seconds respectively. All three have H.264 video, BT.709 colour tags and stereo AAC audio at 44.1 kHz. No separate subtitle stream is present.

| File | Video duration | Pixels | Aspect / fps | Integrated loudness | True peak | Loudness range |
| --- | --- | --- | --- | --- | --- | --- |
| Safwan template | 53.233333 s | 1440 x 2560 | 9:16 / 30 | -11.82 LUFS | +0.38 dBTP | 6.90 LU |
| Sevinc English | 46.600000 s | 720 x 1280 | 9:16 / 30 | -15.53 LUFS | +0.43 dBTP | 10.50 LU |
| Qasem B-roll 3 | 49.266667 s | 2160 x 3840 | 9:16 / 30 | -16.05 LUFS | -2.57 dBTP | 4.80 LU |

These are the **input** measurements from FFmpeg loudnorm, not the filter's simulated output values. No replacement video or audio mix was produced.

Safwan is 2.18 LU above the task's -14 LUFS target. Sevinc is 1.53 LU below it but still has over-full-scale peaks: 20 decoded stereo sample frames, first at 00:33.537 and last at 00:39.107. Her strongest decoded sample peak occurs at 00:33.537. Simply raising her volume would worsen the peaks. Both need mix/limiter attention and a new export check.

Qasem is 2.05 LU below the target and had zero decoded stereo sample frames above full scale. That measurement does not certify subjective sound quality. His soundtrack can be mixed with the eventual main edit rather than treated as a final speech mix.

### Review coverage and outstanding checks

- Full files were decoded for audio measurements and for the visual extraction passes. Inspected visual material comprised 27/24/25 regular frames at two-second intervals for Safwan/Sevinc/Qasem, plus 20/11/49 scene-change frames at a 0.22 threshold.
- Additional visible-caption checks used 61 Safwan and 72 Sevinc frames at approximately half-second intervals within the dialogue sections. End-card checks added 21 Safwan and 6 Sevinc frames. These were inspected as contact sheets/caption crops, with selected full frames enlarged. They are not an uninterrupted playback review.
- A complete list of missing, added or changed **spoken** sentences remains outstanding for all applicable language versions. Subtitle transcription, timing against speech, names as spoken, intelligibility, echo, clinic noise, music balance and audible distortion were not verified.
- Only the three named videos received visual and audio-level review. Extra files were inventoried by name; the Sevinc duplicate and second Qasem file were also hashed. Other loosely named videos were not classified as missing short cuts or language versions on content evidence.
- The metadata dates describe container creation/export, not proven filming dates. Safwan's container was created on 6 Oct despite the 29 Sep filename; that alone is not evidence of an incorrect filming date. Sevinc and Qasem container dates are 5 Oct and 3 Oct respectively.
- The local main reference was used at the commit stated above. No remote update or external production-status check was performed. Photos were outside this review.
- Media, extracted frames, measurement logs and tools remain in the ignored task folder. This document contains no media links, screenshots, patient identifiers or full transcripts. No external paid API was used.
