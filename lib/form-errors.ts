export function somaliFormError(issue: unknown, fallback: string) {
  const message = issue instanceof Error ? issue.message : "";
  const raw = message.toLowerCase();
  if (raw.includes("username")) return "Magaca isticmaalaha waa inuu ka koobnaadaa xarfo, tirooyin, dhibic (.) ama underscore (_); ha gelin meel bannaan ama calaamad kale.";
  if (raw.includes("email") || raw.includes("invalid_format")) return "Email-ka aad gelisay sax ma aha. Hubi inuu leeyahay tusaale ahaan magacaaga@email.com.";
  if (raw.includes("password") || raw.includes("furaha")) return "Furaha sirta ahi waa inuu buuxiyaa shuruudaha loo baahan yahay. Isku day furaha sirta ah oo dheer oo ammaan ah.";
  if (raw.includes("phone") || raw.includes("taleefan")) return "Lambarka taleefanka sax ma aha. Hubi lambarka oo mar kale geli.";
  if (raw.includes("too_small") || raw.includes("required")) return "Fadlan buuxi dhammaan meelaha waajibka ah si sax ah.";
  if (raw.includes("[") && raw.includes("path")) return "Xogta aad gelisay mid ka mid ah meelaha sax ma aha. Hubi meelaha foomka oo mar kale isku day.";
  return message || fallback;
}
