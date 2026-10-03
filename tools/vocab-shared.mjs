/* Shared by build-vocab.mjs and add-daily-words.mjs */
/* words that teach nothing on their own, plus words we never show */
export const STOP = new Set(`the and for are but not you all any can had her was one our out day get has him his how man new now old see two way who boy did its let put say she too use that with have this will your from they know want been good much some time very when come here just like long make many more only over such take than them well were what into also then there their would could should about which other these those after again where being while because before through during without within upon each both few most same than very once here why yes yeah okay hey mrs mr ms etc`.split(/\s+/));
export const BLOCK = new Set(`fuck fucking fucked fucker shit shitty bitch bastard asshole dick cock pussy cunt whore slut nigger nigga fag faggot retard porn sex sexy sexual rape rapist penis vagina boob boobs tits nazi kill killed killing suicide drug drugs cocaine heroin`.split(/\s+/));
export const LEVEL_BY_RANK = (r) => (r < 800 ? 'A1' : r < 2000 ? 'A2' : r < 5000 ? 'B1' : r < 10000 ? 'B2' : 'C1');

