/**
 * Thai ISO-3166-2 province code → Thai name lookup.
 * WooCommerce's `billing.state` uses `TH-10`, `TH-20`, etc. for Thailand.
 * Apps display these raw codes unless we translate — hence this table.
 */

const TH_PROVINCES: Record<string, string> = {
  "TH-10": "กรุงเทพมหานคร",
  "TH-11": "สมุทรปราการ",
  "TH-12": "นนทบุรี",
  "TH-13": "ปทุมธานี",
  "TH-14": "พระนครศรีอยุธยา",
  "TH-15": "อ่างทอง",
  "TH-16": "ลพบุรี",
  "TH-17": "สิงห์บุรี",
  "TH-18": "ชัยนาท",
  "TH-19": "สระบุรี",
  "TH-20": "ชลบุรี",
  "TH-21": "ระยอง",
  "TH-22": "จันทบุรี",
  "TH-23": "ตราด",
  "TH-24": "ฉะเชิงเทรา",
  "TH-25": "ปราจีนบุรี",
  "TH-26": "นครนายก",
  "TH-27": "สระแก้ว",
  "TH-30": "นครราชสีมา",
  "TH-31": "บุรีรัมย์",
  "TH-32": "สุรินทร์",
  "TH-33": "ศรีสะเกษ",
  "TH-34": "อุบลราชธานี",
  "TH-35": "ยโสธร",
  "TH-36": "ชัยภูมิ",
  "TH-37": "อำนาจเจริญ",
  "TH-38": "บึงกาฬ",
  "TH-39": "หนองบัวลำภู",
  "TH-40": "ขอนแก่น",
  "TH-41": "อุดรธานี",
  "TH-42": "เลย",
  "TH-43": "หนองคาย",
  "TH-44": "มหาสารคาม",
  "TH-45": "ร้อยเอ็ด",
  "TH-46": "กาฬสินธุ์",
  "TH-47": "สกลนคร",
  "TH-48": "นครพนม",
  "TH-49": "มุกดาหาร",
  "TH-50": "เชียงใหม่",
  "TH-51": "ลำพูน",
  "TH-52": "ลำปาง",
  "TH-53": "อุตรดิตถ์",
  "TH-54": "แพร่",
  "TH-55": "น่าน",
  "TH-56": "พะเยา",
  "TH-57": "เชียงราย",
  "TH-58": "แม่ฮ่องสอน",
  "TH-60": "นครสวรรค์",
  "TH-61": "อุทัยธานี",
  "TH-62": "กำแพงเพชร",
  "TH-63": "ตาก",
  "TH-64": "สุโขทัย",
  "TH-65": "พิษณุโลก",
  "TH-66": "พิจิตร",
  "TH-67": "เพชรบูรณ์",
  "TH-70": "ราชบุรี",
  "TH-71": "กาญจนบุรี",
  "TH-72": "สุพรรณบุรี",
  "TH-73": "นครปฐม",
  "TH-74": "สมุทรสาคร",
  "TH-75": "สมุทรสงคราม",
  "TH-76": "เพชรบุรี",
  "TH-77": "ประจวบคีรีขันธ์",
  "TH-80": "นครศรีธรรมราช",
  "TH-81": "กระบี่",
  "TH-82": "พังงา",
  "TH-83": "ภูเก็ต",
  "TH-84": "สุราษฎร์ธานี",
  "TH-85": "ระนอง",
  "TH-86": "ชุมพร",
  "TH-90": "สงขลา",
  "TH-91": "สตูล",
  "TH-92": "ตรัง",
  "TH-93": "พัทลุง",
  "TH-94": "ปัตตานี",
  "TH-95": "ยะลา",
  "TH-96": "นราธิวาส",
  // Special administrative
  "TH-S": "พัทยา",
};

const TH_COUNTRIES: Record<string, string> = {
  TH: "ประเทศไทย",
  US: "สหรัฐอเมริกา",
  GB: "สหราชอาณาจักร",
  JP: "ญี่ปุ่น",
  CN: "จีน",
  KR: "เกาหลีใต้",
  SG: "สิงคโปร์",
  MY: "มาเลเซีย",
  LA: "ลาว",
  KH: "กัมพูชา",
  VN: "เวียดนาม",
  MM: "เมียนมา",
  ID: "อินโดนีเซีย",
  PH: "ฟิลิปปินส์",
  IN: "อินเดีย",
  AU: "ออสเตรเลีย",
};

/**
 * "TH-10" → "กรุงเทพมหานคร", "Bangkok" → "Bangkok", "" → "".
 * Accepts the WC-style full code or the bare 2-digit number.
 */
export function thaiProvinceName(code: string | null | undefined): string {
  if (!code) return "";
  const s = code.trim();
  if (!s) return "";
  if (TH_PROVINCES[s]) return TH_PROVINCES[s];
  // Accept "10" → try "TH-10"
  if (/^\d{1,2}$/.test(s) && TH_PROVINCES[`TH-${s}`]) return TH_PROVINCES[`TH-${s}`];
  return s;
}

/** "TH" → "ประเทศไทย"; unknown codes returned as-is. */
export function countryName(code: string | null | undefined): string {
  if (!code) return "";
  const s = code.trim().toUpperCase();
  return TH_COUNTRIES[s] ?? s;
}

/**
 * Sorted list of [code, display name] for use in `<select>` options. Bangkok
 * pinned to the top because it's the most common pick on a Thai shop.
 */
export const THAI_PROVINCE_OPTIONS: Array<{ code: string; name: string }> = (() => {
  const all = Object.entries(TH_PROVINCES).map(([code, name]) => ({ code, name }));
  const bangkok = all.find((p) => p.code === "TH-10");
  const rest = all
    .filter((p) => p.code !== "TH-10")
    .sort((a, b) => a.name.localeCompare(b.name, "th"));
  return bangkok ? [bangkok, ...rest] : rest;
})();
