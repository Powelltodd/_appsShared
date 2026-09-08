/* tnt-shims.js — the TeamWeb globals Scripts/MeetTNT.js reaches for.
 *
 * SHARED by every Bootstrap 5 app that runs the TNT engine — today
 * apps/LiveMeet and apps/ttJudgeScoring. Import as an ES module:
 *
 *     import * as Shims from '/apps/_shared/js/tnt-shims.js';
 *
 * WHY THIS EXISTS. MeetTNT.js is a classic script and resolves a handful of
 * Scripts/Tournaments.js functions off the global scope. Loading
 * Tournaments.js whole would drag in 705 functions of TeamWeb coupling for
 * the five that are actually called, so both apps shim them instead —
 * measured, not guessed. What they must NOT do is shim them separately:
 * these bodies carry real behaviour (MeetDisciplineCode's discipline map is
 * branched on all over MeetTNT.js) and two copies drift.
 *
 * WHAT IS NOT HERE. Each app keeps its own TNT loader — LiveMeet's
 * shared/meettnt.js and ttJudgeScoring's assets/js/tnt.js — because those
 * genuinely differ: LiveMeet re-routes dialogs onto Bootstrap modals, holds
 * a router-owned thisMeet it re-fetches in place, and pins #JudgeLoginEvent
 * BLANK; the judge app does none of that and SETS that input. Sharing the
 * loaders would mean branching inside them on which app is running, which
 * is worse than two honest files. Only the parts with no app-specific
 * content live here.
 */

/* Where the shared TNT fragments live. One constant, so the two apps cannot
   end up pointed at different folders — the failure that mode produces is
   silent (the panel just never appears) and it has bitten before. */
export const FRAGMENT_FOLDER = "apps/_shared/tnt";

/* Tournaments.js:114, verbatim. Reads the #MeetDiscipline hidden input,
   which each app fills from the fetched meet's ProgramId.

   Needed even before any TNT screen paints: ssMeetAccess.js itself calls
   MeetDisciplineCode() at :3782 and :3853, so any screen touching those
   paths needs it defined.

   Deliberately NOT ssMeet's own Discipline getter — that returns 'ART'
   where this returns 'AG', and has no mapping for AOG(156) or RG(155),
   both of which MeetTNT.js branches on. */
export function MeetDisciplineCode() {
  const v = $("#MeetDiscipline").val();
  if (v == "92")  return "AG";
  if (v == "155") return "RG";
  if (v == "156") return "AOG";
  if (v == "132") return "TNT";
  if (v == "146") return "ACRO";
  return "AG";
}

/* Tournaments.js:4. A timeout-scoped serverAPI passthrough. */
export function meetRestCall(sType, sURL, callbackFunction, sDataParams, errorCB, iTimeOutSecs) {
  const iCurrTO = thePageController.ServerTimeOut;
  if (iTimeOutSecs) thePageController.ServerTimeOut = iTimeOutSecs;
  serverAPI(sURL, callbackFunction, null, sType, sDataParams, errorCB);
  thePageController.ServerTimeOut = iCurrTO;
}

/* Tournaments.js:337. Called UNCONDITIONALLY at the end of every schedule
   refresh (MeetTNT.js:529) to stamp a count onto the FAQ button, so it has
   to EXIST or timeBlocksLoadedCB throws and the schedule never renders.

   A no-op rather than a port: the FAQ help system is four more
   Tournaments.js functions plus a slide-out container, and neither new app
   has them. Delete this once the real one is available. */
export function CountAppFAQ(iProgramId, sFuncArea, btTargetButton) { /* no FAQ in the new apps */ }

/* Tournaments.js:65. Resizes a jQuery UI dialog to fit its content by
   measuring offset().top deltas and pushing a pixel height back in.
 *
 * `shouldSkip` is the one app-specific seam. LiveMeet re-routes some TNT
 * dialogs onto Bootstrap modals via ssdialog.js, and for those this must do
 * NOTHING — the measurement assumes an absolutely-positioned jQuery UI box,
 * and inside a modal it produces a tiny height that collapses the body and
 * scrolls the dialog's own buttons out of reach (.modal-dialog-scrollable
 * already provides the behaviour this was hand-rolling). Apps that never
 * re-route pass nothing and get the real measurement every time. */
export function makeAdjustDialogHeight(shouldSkip) {
  return function (theDialog, bottomElementId, maxHeight, extraHeight, minHeight) {
    if (shouldSkip && shouldSkip(theDialog)) return;
    const $bottom = $("#" + bottomElementId);
    if (!theDialog || !$bottom.length) return;
    const iBottomElementH = $bottom.height() || 20;
    const yDiff = $bottom.offset().top + iBottomElementH - theDialog.offset().top + 43;
    let iH = yDiff + extraHeight;
    if (iH > maxHeight) iH = maxHeight;
    if (minHeight && iH < minHeight) iH = minHeight;
    else if (iH > (window.innerHeight - 20)) iH = window.innerHeight - 20;
    theDialog.dialog("option", "height", iH);
  };
}

/* Loud stub for the RotationsEdit.js functions neither app has ported.
   Reached only from discipline paths a Trampoline meet never takes
   (EditRotation from an AOGD flight, EditAthleteScore from an aerobics
   score, PrepareBaseURL from the TeamWeb rotation-sheet print).

   Deliberately noisy: if one of these ever fires it means a real gap, and
   we want to see it rather than have it fail silently. `sAppName` only
   changes the console prefix and the wording the user sees. */
export function makeNotPortedYet(sAppName, sUserMessage) {
  return function (name) {
    return function () {
      console.warn("[" + sAppName + "] " + name + "() is a RotationsEdit.js function " +
                   "that has not been ported. Called with:", arguments);
      if (typeof ssShowAlert === "function")
        ssShowAlert(sUserMessage, "Not available");
    };
  };
}

/* Fetches an html fragment into a host element. Mirrors LiveMeet's
   shared/fragment.js but targets an arbitrary host, because templates and
   dialogs are page-level rather than screen-level.

   serverGetHtml still calls back on TRANSPORT failure, and a missing file
   comes back EMPTY rather than as an error — so an empty body is treated as
   a failure here. Without that check a typo'd folder name looks like
   success and the panel simply never appears, with nothing logged. */
export function loadFragmentOnce(sPage, sHostSelector, sFolder) {
  return new Promise(function (resolve, reject) {
    const $host = $(sHostSelector);
    if (!$host.length) { reject(new Error("missing host " + sHostSelector)); return; }
    const sURL = thePageController.RestServer() +
                 "GetHtmlPage?page=" + encodeURIComponent(sPage) +
                 "&folder=" + encodeURIComponent(sFolder || FRAGMENT_FOLDER);
    serverGetHtml(sURL, $host, function (data) {
      if (!data || !String(data).trim()) { reject(new Error(sPage + " came back empty")); return; }
      resolve();
    });
  });
}

/* $.getScript as a promise. Used for the on-demand MeetTNT.js load. */
export function loadScriptOnce(src) {
  return new Promise(function (resolve, reject) {
    $.getScript(src).done(function () { resolve(); }).fail(function (jqxhr, s, e) {
      reject(new Error("could not load " + src + " — " + (e || s)));
    });
  });
}

/* Publishes the shims MeetTNT.js resolves off the global scope. Must run
   before any of its functions execute — MeetTNT.js makes no calls at load
   time, only inside functions, so an app installing these during its boot
   is early enough.

   Each app calls this and then adds its OWN globals on top (LiveMeet's real
   PrepMeetClass, the judge app's stub for it), which is why this returns
   the notPortedYet factory rather than installing every stub itself. */
export function installCommonShims(opts) {
  const o = opts || {};
  const notPortedYet = makeNotPortedYet(o.appName || "app",
                                        o.notPortedMessage || "This action isn't available yet.");
  window.MeetDisciplineCode = MeetDisciplineCode;
  window.meetRestCall       = meetRestCall;
  window.CountAppFAQ        = CountAppFAQ;
  window.AdjustDialogHeight = makeAdjustDialogHeight(o.skipDialogResize);
  window.EditRotation       = notPortedYet("EditRotation");
  window.EditAthleteScore   = notPortedYet("EditAthleteScore");
  window.PrepareBaseURL     = notPortedYet("PrepareBaseURL");
  window.EditScoringRule    = notPortedYet("EditScoringRule");
  window.ShowAppFAQ         = notPortedYet("ShowAppFAQ");
  return notPortedYet;
}
