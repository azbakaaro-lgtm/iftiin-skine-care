import type { ImageSourcePropType } from "react-native";

export type SkinNeed = "qallalan" | "dufan" | "isku-dhafan" | "finan" | "gaduud";

export type CatalogProduct = {
  id: string;
  name: string;
  brand: string;
  image: ImageSourcePropType;
  category: "Cleanser" | "Moisturizer" | "Sunscreen" | "Serum";
  ingredients: string;
  skinTypes: string[];
  skinConcerns: string[];
  howToUse: string;
  warnings: string;
  price: string;
  availability: string;
  recommendedFor: SkinNeed[];
};

const qiime = "Qiimaha deegaanka ha la cusboonaysiiyo marka la maamulo xogta alaabta.";
const helitaan = "Helitaanka dukaanka ha lagu daro marka la maamulo xogta alaabta.";

export const catalogProducts: CatalogProduct[] = [
  { id: "cerave-hydrating-cleanser", name: "Hydrating Facial Cleanser", brand: "CeraVe", image: require("../assets/products/cerave-hydrating-cleanser.jpg"), category: "Cleanser", ingredients: "Ceramides, Hyaluronic Acid, Glycerin — liiska buuxa ee maaddooyinka ka hubi baakadka.", skinTypes: ["Qallalan", "Caadi", "Isku-dhafan", "Xasaasi"], skinConcerns: ["Qallayl", "Gaduud muuqda", "Difaaca maqaarka"], howToUse: "Ku duug wejiga qoyan subax iyo habeen, kadibna ku raaci biyo.", warnings: "Jooji haddii aad dareento cuncun ama gubasho. Ka fogee indhaha.", price: qiime, availability: helitaan, recommendedFor: ["qallalan", "isku-dhafan", "gaduud"] },
  { id: "cerave-moisturizing-cream", name: "Moisturizing Cream", brand: "CeraVe", image: require("../assets/products/cerave-moisturizing-cream.jpg"), category: "Moisturizer", ingredients: "Ceramides, Hyaluronic Acid — liiska buuxa ee maaddooyinka ka hubi baakadka.", skinTypes: ["Aad u qallalan", "Qallalan", "Caadi", "Xasaasi"], skinConcerns: ["Qallayl", "Difaaca maqaarka"], howToUse: "Mari kadib nadiifinta, subax ama habeen sida uu kuu baahan yahay maqaarkaagu.", warnings: "Ku tijaabi meel yar oo maqaarka ah marka aad alaab cusub bilaabayso.", price: qiime, availability: helitaan, recommendedFor: ["qallalan", "isku-dhafan", "gaduud"] },
  { id: "anthelios-uv-air-spf50", name: "Anthelios UV Air SPF 50", brand: "La Roche-Posay", image: require("../assets/products/anthelios-spf50.jpg"), category: "Sunscreen", ingredients: "SPF oo ballaaran — liiska buuxa ee maaddooyinka firfircoon iyo kuwa kale ka hubi baakadka.", skinTypes: ["Caadi", "Isku-dhafan", "Dufan badan", "Qallalan"], skinConcerns: ["Midab aan sinnayn", "Qorrax badan"], howToUse: "Mari subax kasta; dib u mari sida ku qoran baakadka marka qorraxdu ku badato.", warnings: "Tilmaamaha isticmaalka qorraxda iyo dib-u-marista ka hubi baakadka alaabta.", price: qiime, availability: helitaan, recommendedFor: ["qallalan", "dufan", "isku-dhafan", "finan", "gaduud"] },
  { id: "ordinary-niacinamide", name: "Niacinamide 10% + Zinc 1%", brand: "The Ordinary", image: require("../assets/products/ordinary-niacinamide.jpg"), category: "Serum", ingredients: "Niacinamide 10%, Zinc PCA 1% — liiska buuxa ee maaddooyinka ka hubi baakadka.", skinTypes: ["Isku-dhafan", "Dufan badan", "Caadi"], skinConcerns: ["Dufan", "Calaamadaha finanka", "Muuqaal aan sinnayn"], howToUse: "Ku bilow si tartiib ah sida ku qoran baakadka; mari kadib nadiifinta, ka hor kareemka qoyaansiinta.", warnings: "Ku tijaabi meel yar oo maqaarka ah. Ha isku darin alaabo firfircoon oo badan hal mar adigoon taxaddar samayn.", price: qiime, availability: helitaan, recommendedFor: ["dufan", "isku-dhafan", "finan"] },
  { id: "cetaphil-daily-hydrating-lotion", name: "Daily Hydrating Lotion", brand: "Cetaphil", image: require("../assets/products/cetaphil-hydrating-lotion.png"), category: "Moisturizer", ingredients: "Hyaluronic Acid — liiska buuxa ee maaddooyinka ka hubi baakadka.", skinTypes: ["Qallalan", "Caadi", "Isku-dhafan"], skinConcerns: ["Qallayl", "Difaaca maqaarka"], howToUse: "Mari wejiga nadiifka ah subax ama habeen.", warnings: "Ka hubi baakadka waxyaabaha ku jira ka hor inta aadan isticmaalin.", price: qiime, availability: helitaan, recommendedFor: ["qallalan", "isku-dhafan", "gaduud"] },
  { id: "cerave-blemish-control-gel", name: "Blemish Control Gel", brand: "CeraVe", image: require("../assets/products/cerave-blemish-control.jpg"), category: "Serum", ingredients: "AHA, BHA — liiska buuxa ee maaddooyinka ka hubi baakadka.", skinTypes: ["Dufan badan", "Isku-dhafan"], skinConcerns: ["Finan muuqda", "Dufan", "Daloolo muuqda"], howToUse: "Isticmaal sida ku qoran baakadka, kuna bilow si tartiib ah.", warnings: "Ha isku darin alaabo firfircoon oo badan hal mar. Jooji haddii gubasho ama cuncun kugu bato.", price: qiime, availability: helitaan, recommendedFor: ["dufan", "isku-dhafan", "finan"] },
  { id: "ordinary-azelaic-acid", name: "Azelaic Acid Suspension 10%", brand: "The Ordinary", image: require("../assets/products/ordinary-azelaic-acid.jpg"), category: "Serum", ingredients: "Azelaic Acid 10% — liiska buuxa ee maaddooyinka ka hubi baakadka.", skinTypes: ["Caadi", "Isku-dhafan", "Dufan badan"], skinConcerns: ["Muuqaal aan sinnayn", "Finan muuqda", "Gaduud muuqda"], howToUse: "Ku bilow si tartiib ah sida ku qoran baakadka.", warnings: "Ku tijaabi meel yar oo maqaarka ah ka hor isticmaalka joogtada ah.", price: qiime, availability: helitaan, recommendedFor: ["dufan", "isku-dhafan", "finan", "gaduud"] },
  { id: "lrp-toleriane-rosaliac", name: "Toleriane Rosaliac AR SPF 30", brand: "La Roche-Posay", image: require("../assets/products/lrp-rosaliac-ar.webp"), category: "Moisturizer", ingredients: "SPF 30 — liiska buuxa ee maaddooyinka ka hubi baakadka.", skinTypes: ["Caadi", "Qallalan", "Xasaasi"], skinConcerns: ["Gaduud muuqda", "Qallayl"], howToUse: "Mari subaxdii sida ku qoran baakadka.", warnings: "Haddii aad leedahay xasaasiyad, ka hubi baakadka maaddooyinka ku jira.", price: qiime, availability: helitaan, recommendedFor: ["qallalan", "gaduud"] },
  { id: "ordinary-radiant-collection", name: "Radiant Skin Collection", brand: "The Ordinary", image: require("../assets/products/the-ordinary-collection.jpg"), category: "Serum", ingredients: "Hyaluronic Acid, Niacinamide — liiska buuxa ee maaddooyinka ka hubi baakadka.", skinTypes: ["Caadi", "Isku-dhafan", "Dufan badan", "Qallalan"], skinConcerns: ["Qallayl", "Dufan", "Muuqaal aan sinnayn"], howToUse: "Raac nidaamka iyo tilmaamaha ku qoran baakadka xirmada.", warnings: "Ha wada bilaabin alaabo badan oo firfircoon hal mar.", price: qiime, availability: helitaan, recommendedFor: ["qallalan", "dufan", "isku-dhafan", "finan", "gaduud"] },
  { id: "ordinary-mini-discovery", name: "The Mini Discovery Set", brand: "The Ordinary", image: require("../assets/products/the-ordinary-discovery.jpg"), category: "Serum", ingredients: "Maaddooyin kala duwan — liiska buuxa ee maaddooyinka ka hubi baakadka.", skinTypes: ["Caadi", "Isku-dhafan"], skinConcerns: ["Muuqaal aan sinnayn", "Daryeel joogto ah"], howToUse: "Hal alaab mar ku bilow, kuna raac tilmaamaha ku qoran baakadka.", warnings: "Ha isku darin alaabo aanad aqoon u lahayn; ku tijaabi meel yar marka hore.", price: qiime, availability: helitaan, recommendedFor: ["qallalan", "dufan", "isku-dhafan", "finan", "gaduud"] },
];

export const catalogGroups: { id: SkinNeed; title: string; description: string }[] = [
  { id: "qallalan", title: "Wajiga qallalan", description: "8 doorasho oo u janjeera qoyaansiin iyo taageeridda difaaca maqaarka." },
  { id: "dufan", title: "Wajiga dufanka leh", description: "8 doorasho oo loogu talagalay dufanka iyo muuqaalka daloolada." },
  { id: "isku-dhafan", title: "Maqaarka isku-dhafan", description: "8 doorasho oo ku habboon meelaha isku dhafan." },
  { id: "finan", title: "Maqaarka finanku ku badan yihiin", description: "8 doorasho oo daryeel guud u ah finan muuqda." },
  { id: "gaduud", title: "Maqaarka gaduudka leh", description: "8 doorasho oo daryeel deggan u ah muuqaalka gaduudka." },
];

export function productsForNeed(need: SkinNeed) { return catalogProducts.filter((product) => product.recommendedFor.includes(need)).slice(0, 8); }

export function productsForRecommendations(skinType: string, concerns: string[]) {
  const needs: SkinNeed[] = [];
  if (skinType === "Aad u qallalan" || skinType === "Qallalan") needs.push("qallalan");
  if (skinType === "Dufan badan") needs.push("dufan");
  if (skinType === "Isku-dhafan") needs.push("isku-dhafan");
  if (concerns.some((concern) => concern.includes("Finan"))) needs.push("finan");
  if (concerns.some((concern) => concern.includes("Gaduud"))) needs.push("gaduud");
  const selectedNeeds = needs.length ? needs : ["isku-dhafan"];
  return catalogProducts.filter((product) => product.recommendedFor.some((need) => selectedNeeds.includes(need))).slice(0, 4);
}

export function productsForRoutine(concerns: string[]) {
  const includesConcern = (product: CatalogProduct) => product.skinConcerns.some((concern) => concerns.includes(concern));
  return [catalogProducts.find((product) => product.category === "Cleanser"), catalogProducts.find((product) => product.category === "Moisturizer"), catalogProducts.find((product) => product.category === "Sunscreen"), catalogProducts.find((product) => product.category === "Serum" && includesConcern(product))].filter(Boolean) as CatalogProduct[];
}
