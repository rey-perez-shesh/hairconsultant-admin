import { defineString } from "firebase-functions/params";
import { setGlobalOptions } from "firebase-functions/v2";

// Must match the Firestore database's region (see functions/.env).
setGlobalOptions({ region: defineString("FUNCTIONS_REGION"), maxInstances: 10 });

export { bootstrapAdmin, deleteUserAccount, setAdminRole, setUserDisabled } from "./admin.js";
export { geminiProxy } from "./gemini.js";
export { backfillStats, onConsultationWritten, onFeedbackWritten, onUserWritten } from "./stats.js";
