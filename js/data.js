/* Content database — local, offline, editable.
   Words line format:  en|he|pos|level|emoji|ipa|example|exampleHe
   Expressions format: kind|cat|phrase|he|literal|real|example|exampleHe|context|formality(1-3)|region|frequency(1-3)|level */
(function () {
  const CATEGORIES = [
    { id: 'nature', he: 'טבע', icon: '🌿' },
    { id: 'work', he: 'עבודה', icon: '💼' },
    { id: 'travel', he: 'טיולים', icon: '🧳' },
    { id: 'food', he: 'אוכל', icon: '🍽️' },
    { id: 'family', he: 'משפחה', icon: '👨‍👩‍👧' },
    { id: 'relationships', he: 'זוגיות', icon: '❤️' },
    { id: 'sports', he: 'ספורט', icon: '⚽' },
    { id: 'tech', he: 'טכנולוגיה', icon: '💻' },
    { id: 'finance', he: 'פיננסים', icon: '💰' },
    { id: 'business', he: 'עסקים', icon: '📈' },
    { id: 'airport', he: 'שדה תעופה', icon: '✈️' },
    { id: 'restaurant', he: 'מסעדות', icon: '🍝' },
    { id: 'hotel', he: 'מלון', icon: '🏨' },
    { id: 'shopping', he: 'קניות', icon: '🛍️' },
    { id: 'health', he: 'בריאות', icon: '🩺' },
    { id: 'daily', he: 'חיי יום־יום', icon: '☀️' }
  ];
  /* word groups that live inside a broader topic */
  const CAT_ALIAS = { home: 'daily', transport: 'daily', studies: 'daily', entertainment: 'daily', social: 'daily' };

  const WORDS = {
nature: `tree|עץ|n|A1|🌳|/triː/|There is a big tree in our garden.|יש עץ גדול בגינה שלנו.
river|נהר|n|A1|🏞️|/ˈrɪv.ər/|We swam in the river last summer.|שחינו בנהר בקיץ שעבר.
mountain|הר|n|A1|⛰️|/ˈmaʊn.tən/|They climbed the mountain in five hours.|הם טיפסו על ההר בחמש שעות.
weather|מזג אוויר|n|A1|🌤️|/ˈweð.ər/|The weather is nice today.|מזג האוויר נעים היום.
desert|מדבר|n|A2|🏜️|/ˈdez.ərt/|It rarely rains in the desert.|כמעט אף פעם לא יורד גשם במדבר.
environment|סביבה|n|B1|🌍|/ɪnˈvaɪ.rən.mənt/|We need to protect the environment.|אנחנו צריכים להגן על הסביבה.
wildlife|חיות בר|n|B1|🦌|/ˈwaɪld.laɪf/|The park is full of wildlife.|הפארק מלא בחיות בר.
drought|בצורת|n|B2|🌵|/draʊt/|The drought destroyed the crops.|הבצורת הרסה את היבולים.`,
food: `bread|לחם|n|A1|🍞|/bred/|Can you buy bread on your way home?|אתה יכול לקנות לחם בדרך הביתה?
hungry|רעב|adj|A1|😋|/ˈhʌŋ.ɡri/|I'm so hungry, let's eat.|אני כל כך רעב, בוא נאכל.
delicious|טעים מאוד|adj|A2|🤤|/dɪˈlɪʃ.əs/|This soup is delicious!|המרק הזה טעים מאוד!
recipe|מתכון|n|A2|📝|/ˈres.ɪ.pi/|My grandmother gave me her recipe.|סבתא שלי נתנה לי את המתכון שלה.
spicy|חריף|adj|A2|🌶️|/ˈspaɪ.si/|Is this dish too spicy for you?|המנה הזאת חריפה מדי בשבילך?
ingredient|מרכיב|n|B1|🥕|/ɪnˈɡriː.di.ənt/|Flour is the main ingredient.|קמח הוא המרכיב העיקרי.
leftovers|שאריות|n|B1|🥡|/ˈleftˌoʊ.vərz/|We ate leftovers for lunch.|אכלנו שאריות לארוחת צהריים.
craving|חשק עז|n|B2|🍫|/ˈkreɪ.vɪŋ/|I have a craving for chocolate.|יש לי חשק עז לשוקולד.`,
work: `job|עבודה, משרה|n|A1|💼|/dʒɑːb/|She loves her new job.|היא אוהבת את העבודה החדשה שלה.
meeting|פגישה|n|A2|🗓️|/ˈmiː.tɪŋ/|The meeting starts at ten.|הפגישה מתחילה בעשר.
colleague|עמית לעבודה|n|B1|🤝|/ˈkɑː.liːɡ/|My colleague helped me with the report.|העמית שלי עזר לי עם הדוח.
deadline|מועד אחרון|n|B1|⏰|/ˈded.laɪn/|The deadline is next Friday.|המועד האחרון הוא ביום שישי הבא.
salary|משכורת|n|B1|💵|/ˈsæl.ər.i/|He asked for a higher salary.|הוא ביקש משכורת גבוהה יותר.
promotion|קידום|n|B1|📈|/prəˈmoʊ.ʃən/|She got a promotion last month.|היא קיבלה קידום בחודש שעבר.
resign|להתפטר|v|B2|🚪|/rɪˈzaɪn/|He decided to resign from his job.|הוא החליט להתפטר מהעבודה.
workload|עומס עבודה|n|B2|📚|/ˈwɝːk.loʊd/|My workload is crazy this week.|עומס העבודה שלי מטורף השבוע.`,
tech: `computer|מחשב|n|A1|💻|/kəmˈpjuː.tər/|My computer is very slow.|המחשב שלי איטי מאוד.
password|סיסמה|n|A2|🔑|/ˈpæs.wɝːd/|Don't share your password with anyone.|אל תשתף את הסיסמה שלך עם אף אחד.
download|להוריד (קובץ)|v|A2|⬇️|/ˈdaʊn.loʊd/|Download the app for free.|הורידו את האפליקציה בחינם.
update|עדכון|n|A2|🔄|/ˈʌp.deɪt/|Install the latest update.|התקן את העדכון האחרון.
device|מכשיר|n|B1|📱|/dɪˈvaɪs/|You can use the app on any device.|אפשר להשתמש באפליקציה בכל מכשיר.
feature|תכונה, פיצ'ר|n|B1|✨|/ˈfiː.tʃər/|This phone has a cool new feature.|לטלפון הזה יש פיצ'ר חדש ומגניב.
reliable|אמין|adj|B2|✅|/rɪˈlaɪ.ə.bəl/|We need a reliable internet connection.|אנחנו צריכים חיבור אינטרנט אמין.
outdated|מיושן|adj|B2|📼|/ˌaʊtˈdeɪ.tɪd/|This software is outdated.|התוכנה הזאת מיושנת.`,
business: `customer|לקוח|n|A2|🧑‍💼|/ˈkʌs.tə.mər/|The customer is always right.|הלקוח תמיד צודק.
company|חברה (עסק)|n|A2|🏢|/ˈkʌm.pə.ni/|He works for a big company.|הוא עובד בחברה גדולה.
profit|רווח|n|B1|💹|/ˈprɑː.fɪt/|The company made a big profit this year.|החברה הרוויחה רווח גדול השנה.
competitor|מתחרה|n|B1|🏁|/kəmˈpet.ɪ.tər/|Our main competitor lowered its prices.|המתחרה העיקרי שלנו הוריד מחירים.
launch|להשיק|v|B1|🚀|/lɑːntʃ/|They will launch the product in May.|הם ישיקו את המוצר במאי.
strategy|אסטרטגיה|n|B1|♟️|/ˈstræt.ə.dʒi/|We need a new marketing strategy.|אנחנו צריכים אסטרטגיית שיווק חדשה.
negotiate|לנהל משא ומתן|v|B2|🗣️|/nəˈɡoʊ.ʃi.eɪt/|We need to negotiate a better price.|אנחנו צריכים לנהל משא ומתן על מחיר טוב יותר.
stakeholder|בעל עניין|n|C1|👥|/ˈsteɪkˌhoʊl.dər/|We met with all the stakeholders.|נפגשנו עם כל בעלי העניין.`,
finance: `money|כסף|n|A1|💰|/ˈmʌn.i/|I don't have money with me.|אין לי כסף עליי.
cheap|זול|adj|A1|🏷️|/tʃiːp/|This shirt was really cheap.|החולצה הזאת הייתה ממש זולה.
expensive|יקר|adj|A1|💎|/ɪkˈspen.sɪv/|Tel Aviv is an expensive city.|תל אביב היא עיר יקרה.
save|לחסוך|v|A2|🐷|/seɪv/|I save money every month.|אני חוסך כסף כל חודש.
budget|תקציב|n|B1|📊|/ˈbʌdʒ.ɪt/|We have a small budget for the trip.|יש לנו תקציב קטן לטיול.
loan|הלוואה|n|B1|🏦|/loʊn/|They took a loan to buy a house.|הם לקחו הלוואה כדי לקנות בית.
invest|להשקיע|v|B1|📈|/ɪnˈvest/|She wants to invest in stocks.|היא רוצה להשקיע במניות.
debt|חוב|n|B2|🧾|/det/|He finally paid off his debt.|הוא סוף סוף סגר את החוב שלו.`,
sports: `team|קבוצה|n|A1|👥|/tiːm/|Which team do you support?|באיזו קבוצה אתה תומך?
win|לנצח|v|A1|🏆|/wɪn/|We won the game!|ניצחנו במשחק!
coach|מאמן|n|A2|🧢|/koʊtʃ/|The coach is very strict.|המאמן מאוד קפדן.
score|תוצאה|n|A2|🥅|/skɔːr/|What's the score?|מה התוצאה?
match|משחק (תחרות)|n|A2|⚽|/mætʃ/|The match starts at eight.|המשחק מתחיל בשמונה.
injury|פציעה|n|B1|🤕|/ˈɪn.dʒər.i/|He missed the season because of an injury.|הוא פספס את העונה בגלל פציעה.
tie|תיקו|n|B1|🤝|/taɪ/|The game ended in a tie.|המשחק נגמר בתיקו.
workout|אימון|n|B1|🏋️|/ˈwɝːk.aʊt/|I do a short workout every morning.|אני עושה אימון קצר כל בוקר.`,
health: `doctor|רופא|n|A1|👩‍⚕️|/ˈdɑːk.tər/|You should see a doctor.|כדאי שתלך לרופא.
headache|כאב ראש|n|A2|🤯|/ˈhed.eɪk/|I have a terrible headache.|יש לי כאב ראש נוראי.
medicine|תרופה|n|A2|💊|/ˈmed.ɪ.sən/|Take this medicine twice a day.|קח את התרופה הזאת פעמיים ביום.
fever|חום (גוף)|n|A2|🤒|/ˈfiː.vər/|The child has a high fever.|לילד יש חום גבוה.
appointment|תור (לרופא וכד')|n|B1|📅|/əˈpɔɪnt.mənt/|I have a doctor's appointment tomorrow.|יש לי תור לרופא מחר.
symptom|תסמין|n|B1|🌡️|/ˈsɪmp.təm/|What are your symptoms?|מה התסמינים שלך?
recover|להחלים|v|B1|💪|/rɪˈkʌv.ər/|She recovered quickly after the surgery.|היא החלימה מהר אחרי הניתוח.
exhausted|מותש|adj|B2|😩|/ɪɡˈzɑː.stɪd/|I'm exhausted after this week.|אני מותש אחרי השבוע הזה.`,
family: `parents|הורים|n|A1|👪|/ˈper.ənts/|My parents live in Haifa.|ההורים שלי גרים בחיפה.
brother|אח|n|A1|👦|/ˈbrʌð.ər/|My little brother is ten.|אחי הקטן בן עשר.
cousin|בן דוד, בת דודה|n|A2|🧒|/ˈkʌz.ən/|My cousin is coming to visit.|בן הדוד שלי בא לבקר.
grandparents|סבא וסבתא|n|A2|👵|/ˈɡræn.per.ənts/|We visit our grandparents every Saturday.|אנחנו מבקרים את סבא וסבתא כל שבת.
raise|לגדל (ילדים)|v|B1|🍼|/reɪz/|They raised three kids.|הם גידלו שלושה ילדים.
sibling|אח או אחות|n|B1|👫|/ˈsɪb.lɪŋ/|Do you have any siblings?|יש לך אחים?
get along with|להסתדר עם|phr|B1|🤗|/ɡet əˈlɔːŋ wɪð/|I get along with my sister.|אני מסתדר עם אחותי.
upbringing|חינוך, גידול|n|C1|🏡|/ˈʌpˌbrɪŋ.ɪŋ/|He had a strict upbringing.|הוא גדל בחינוך נוקשה.`,
relationships: `friend|חבר|n|A1|🧑‍🤝‍🧑|/frend/|She is my best friend.|היא החברה הכי טובה שלי.
date|דייט|n|A2|🌹|/deɪt/|We went on a date last night.|יצאנו לדייט אתמול בלילה.
boyfriend|חבר (בן זוג)|n|A2|💑|/ˈbɔɪ.frend/|Her boyfriend is from London.|החבר שלה מלונדון.
trust|לסמוך, אמון|v|B1|🤞|/trʌst/|I trust you completely.|אני סומך עליך לגמרי.
jealous|מקנא|adj|B1|😒|/ˈdʒel.əs/|Don't be jealous.|אל תקנא.
break up|להיפרד|phr|B1|💔|/breɪk ʌp/|They broke up after two years.|הם נפרדו אחרי שנתיים.
commitment|מחויבות|n|B2|💍|/kəˈmɪt.mənt/|He is afraid of commitment.|הוא מפחד ממחויבות.
supportive|תומך|adj|B2|🫶|/səˈpɔːr.tɪv/|My partner is very supportive.|בן הזוג שלי מאוד תומך.`,
home: `kitchen|מטבח|n|A1|🍳|/ˈkɪtʃ.ən/|Mom is in the kitchen.|אמא במטבח.
bedroom|חדר שינה|n|A1|🛏️|/ˈbed.ruːm/|The apartment has two bedrooms.|בדירה יש שני חדרי שינה.
neighbor|שכן|n|A2|🏘️|/ˈneɪ.bər/|Our neighbor has a cute dog.|לשכן שלנו יש כלב חמוד.
rent|שכר דירה|n|A2|🔑|/rent/|The rent is too high.|שכר הדירה גבוה מדי.
clean up|לנקות, לסדר|phr|A2|🧹|/kliːn ʌp/|Let's clean up the living room.|בוא נסדר את הסלון.
furniture|רהיטים|n|B1|🛋️|/ˈfɝː.nɪ.tʃər/|We bought new furniture.|קנינו רהיטים חדשים.
landlord|בעל הדירה|n|B1|🧔|/ˈlænd.lɔːrd/|Call the landlord about the leak.|תתקשר לבעל הדירה לגבי הנזילה.
cozy|נעים, חמים|adj|B1|🕯️|/ˈkoʊ.zi/|Your apartment is so cozy.|הדירה שלך כל כך נעימה.`,
transport: `bus|אוטובוס|n|A1|🚌|/bʌs/|I take the bus to work.|אני נוסע לעבודה באוטובוס.
train|רכבת|n|A1|🚆|/treɪn/|The train is late again.|הרכבת שוב מאחרת.
ticket|כרטיס|n|A1|🎫|/ˈtɪk.ɪt/|How much is a ticket to Jerusalem?|כמה עולה כרטיס לירושלים?
traffic|פקקים, תנועה|n|A2|🚦|/ˈtræf.ɪk/|There's a lot of traffic today.|יש הרבה פקקים היום.
station|תחנה|n|A2|🚉|/ˈsteɪ.ʃən/|Where is the train station?|איפה תחנת הרכבת?
get off|לרדת (מכלי תחבורה)|phr|A2|🚏|/ɡet ɔːf/|Get off at the next stop.|תרד בתחנה הבאה.
commute|הנסיעה לעבודה|n|B1|🚗|/kəˈmjuːt/|My commute takes an hour.|הנסיעה שלי לעבודה לוקחת שעה.
delay|עיכוב|n|B1|⏳|/dɪˈleɪ/|Sorry for the delay.|סליחה על העיכוב.`,
airport: `flight|טיסה|n|A1|✈️|/flaɪt/|Our flight leaves at six.|הטיסה שלנו יוצאת בשש.
passport|דרכון|n|A1|🛂|/ˈpæs.pɔːrt/|Don't forget your passport.|אל תשכח את הדרכון.
luggage|מזוודות, כבודה|n|A2|🧳|/ˈlʌɡ.ɪdʒ/|Where can I pick up my luggage?|איפה אני יכול לאסוף את המזוודות?
gate|שער (עלייה למטוס)|n|A2|🚪|/ɡeɪt/|Boarding is at gate 12.|העלייה למטוס בשער 12.
boarding pass|כרטיס עלייה למטוס|n|A2|🎟️|/ˈbɔːr.dɪŋ pæs/|Please show your boarding pass.|בבקשה הציגו את כרטיס העלייה למטוס.
check in|לעשות צ'ק־אין|phr|A2|✅|/tʃek ɪn/|You can check in online.|אפשר לעשות צ'ק־אין אונליין.
layover|עצירת ביניים|n|B1|🕐|/ˈleɪˌoʊ.vər/|We have a three-hour layover in Rome.|יש לנו עצירת ביניים של שלוש שעות ברומא.
customs|מכס|n|B1|🛃|/ˈkʌs.təmz/|We went through customs quickly.|עברנו במכס מהר.`,
hotel: `room|חדר|n|A1|🚪|/ruːm/|I'd like a room for two nights.|אני רוצה חדר לשני לילות.
key|מפתח|n|A1|🔑|/kiː/|I lost my room key.|איבדתי את מפתח החדר.
reservation|הזמנה (מראש)|n|A2|📋|/ˌrez.ərˈveɪ.ʃən/|I have a reservation under the name Cohen.|יש לי הזמנה על השם כהן.
reception|דלפק קבלה|n|A2|🛎️|/rɪˈsep.ʃən/|Ask at the reception.|תשאל בקבלה.
available|פנוי, זמין|adj|A2|🟢|/əˈveɪ.lə.bəl/|Is there a room available?|יש חדר פנוי?
check out|לעשות צ'ק־אאוט|phr|A2|👋|/tʃek aʊt/|We need to check out by eleven.|אנחנו צריכים לעשות צ'ק־אאוט עד אחת עשרה.
amenities|שירותים ומתקנים|n|B2|🏊|/əˈmen.ə.tiz/|The hotel has great amenities.|במלון יש מתקנים מעולים.
complimentary|ללא תשלום (מתנת המקום)|adj|B2|🎁|/ˌkɑːm.pləˈmen.tər.i/|Breakfast is complimentary.|ארוחת הבוקר ללא תשלום.`,
restaurant: `menu|תפריט|n|A1|📜|/ˈmen.juː/|Can I see the menu, please?|אפשר לראות את התפריט, בבקשה?
waiter|מלצר|n|A1|🤵|/ˈweɪ.tər/|The waiter was very friendly.|המלצר היה מאוד נחמד.
table for two|שולחן לשניים|phr|A1|🍽️|/ˈteɪ.bəl fɔːr tuː/|A table for two, please.|שולחן לשניים, בבקשה.
order|להזמין|v|A2|🧾|/ˈɔːr.dər/|Are you ready to order?|אתם מוכנים להזמין?
bill|חשבון|n|A2|💳|/bɪl/|Can we have the bill, please?|אפשר את החשבון, בבקשה?
tip|טיפ|n|A2|🪙|/tɪp/|We left a good tip.|השארנו טיפ טוב.
allergic|אלרגי|adj|B1|🥜|/əˈlɝː.dʒɪk/|I'm allergic to nuts.|אני אלרגי לאגוזים.
takeaway|אוכל לקחת|n|B1|🥡|/ˈteɪk.ə.weɪ/|Is this for here or takeaway?|זה לפה או לקחת?`,
shopping: `shop|חנות|n|A1|🏪|/ʃɑːp/|The shop closes at nine.|החנות נסגרת בתשע.
price|מחיר|n|A1|🏷️|/praɪs/|What's the price of this jacket?|מה המחיר של המעיל הזה?
size|מידה|n|A1|📏|/saɪz/|Do you have this in a larger size?|יש לכם את זה במידה גדולה יותר?
try on|למדוד (בגד)|phr|A2|👗|/traɪ ɑːn/|Can I try on these jeans?|אפשר למדוד את הג'ינס האלה?
sale|מבצע, מכירה|n|A2|🛍️|/seɪl/|Everything is on sale today.|הכול במבצע היום.
receipt|קבלה (על תשלום)|n|B1|🧾|/rɪˈsiːt/|Keep the receipt in case you return it.|שמור את הקבלה למקרה שתחזיר.
refund|החזר כספי|n|B1|💸|/ˈriː.fʌnd/|I'd like a refund, please.|אני רוצה החזר כספי, בבקשה.
bargain|מציאה|n|B2|🤑|/ˈbɑːr.ɡɪn/|This jacket was a real bargain.|המעיל הזה היה מציאה אמיתית.`,
travel: `trip|טיול, נסיעה|n|A1|🗺️|/trɪp/|How was your trip?|איך היה הטיול?
beach|חוף ים|n|A1|🏖️|/biːtʃ/|Let's go to the beach.|בוא נלך לחוף.
map|מפה|n|A1|🧭|/mæp/|Can you show me on the map?|אתה יכול להראות לי על המפה?
abroad|בחו"ל|adv|A2|🌍|/əˈbrɑːd/|I've never been abroad.|אף פעם לא הייתי בחו"ל.
backpack|תרמיל|n|A2|🎒|/ˈbæk.pæk/|I travel with just a backpack.|אני מטייל רק עם תרמיל.
sightseeing|סיור באתרים|n|B1|📸|/ˈsaɪtˌsiː.ɪŋ/|We spent the day sightseeing.|בילינו את היום בסיור באתרים.
itinerary|מסלול טיול|n|B2|📍|/aɪˈtɪn.ə.rer.i/|Let's plan our itinerary.|בוא נתכנן את מסלול הטיול.
breathtaking|עוצר נשימה|adj|B2|🤩|/ˈbreθˌteɪ.kɪŋ/|The view was breathtaking.|הנוף היה עוצר נשימה.`,
studies: `teacher|מורה|n|A1|👩‍🏫|/ˈtiː.tʃər/|Our teacher is very patient.|המורה שלנו מאוד סבלני.
homework|שיעורי בית|n|A1|📓|/ˈhoʊm.wɝːk/|I finished my homework.|סיימתי את שיעורי הבית.
exam|מבחן|n|A2|📝|/ɪɡˈzæm/|I have an exam tomorrow.|יש לי מבחן מחר.
improve|לשפר|v|A2|📈|/ɪmˈpruːv/|I want to improve my English.|אני רוצה לשפר את האנגלית שלי.
degree|תואר|n|B1|🎓|/dɪˈɡriː/|She has a degree in psychology.|יש לה תואר בפסיכולוגיה.
knowledge|ידע|n|B1|🧠|/ˈnɑː.lɪdʒ/|Knowledge is power.|ידע הוא כוח.
assignment|מטלה|n|B1|🗂️|/əˈsaɪn.mənt/|The assignment is due on Monday.|צריך להגיש את המטלה ביום שני.
scholarship|מלגה|n|B2|🏅|/ˈskɑː.lər.ʃɪp/|He won a scholarship to study abroad.|הוא זכה במלגה ללמוד בחו"ל.`,
entertainment: `movie|סרט|n|A1|🎬|/ˈmuː.vi/|Let's watch a movie tonight.|בוא נראה סרט הערב.
song|שיר|n|A1|🎵|/sɔːŋ/|This is my favorite song.|זה השיר האהוב עליי.
series|סדרה|n|A2|📺|/ˈsɪr.iːz/|I'm watching a new series.|אני צופה בסדרה חדשה.
episode|פרק|n|A2|🎞️|/ˈep.ə.soʊd/|Just one more episode!|רק עוד פרק אחד!
actor|שחקן|n|A2|🎭|/ˈæk.tər/|He is a famous actor.|הוא שחקן מפורסם.
binge-watch|לצפות ברצף|v|B1|🍿|/ˈbɪndʒ wɑːtʃ/|We binge-watched the whole season.|צפינו ברצף בכל העונה.
spoiler|ספוילר|n|B1|🤐|/ˈspɔɪ.lər/|No spoilers, please!|בלי ספוילרים, בבקשה!
plot|עלילה|n|B1|📖|/plɑːt/|The plot was hard to follow.|היה קשה לעקוב אחרי העלילה.`,
social: `post|פוסט, לפרסם|v|A2|📝|/poʊst/|She posted a photo from her trip.|היא פרסמה תמונה מהטיול.
follower|עוקב|n|A2|👣|/ˈfɑː.loʊ.ər/|He has thousands of followers.|יש לו אלפי עוקבים.
share|לשתף|v|A2|🔁|/ʃer/|Share this video with your friends.|שתפו את הסרטון עם החברים.
comment|תגובה|n|A2|💬|/ˈkɑː.ment/|Leave a comment below.|השאירו תגובה למטה.
trending|בטרנד, פופולרי עכשיו|adj|B1|🔥|/ˈtren.dɪŋ/|This song is trending right now.|השיר הזה בטרנד עכשיו.
viral|ויראלי|adj|B1|🚀|/ˈvaɪ.rəl/|The video went viral.|הסרטון הפך לוויראלי.
notification|התראה|n|B1|🔔|/ˌnoʊ.tə.fəˈkeɪ.ʃən/|I turned off my notifications.|כיביתי את ההתראות.
influencer|משפיען|n|B1|🤳|/ˈɪn.flu.ən.sər/|She works as an influencer.|היא עובדת כמשפיענית.`
  };

  const EXPRESSIONS = `slang|texting|LOL|צוחק בקול, חחח|Laughing Out Loud|משהו מצחיק אותי|That meme is so funny, LOL.|המם הזה כל כך מצחיק, חחח.|הודעות ורשתות חברתיות|1|כללי|3|A2
slang|texting|OMG|אוי אלוהים, וואו|Oh My God|הפתעה או התרגשות|OMG, I passed the test!|וואו, עברתי את המבחן!|הודעות, דיבור קליל|1|כללי|3|A2
slang|abbr|BTW|דרך אגב|By The Way|מוסיפים מידע צדדי|BTW, the meeting moved to three.|דרך אגב, הפגישה עברה לשלוש.|הודעות, גם בעבודה|2|כללי|3|A2
slang|texting|IDK|לא יודע|I Don't Know|לא יודע|IDK, what do you want to eat?|לא יודע, מה בא לך לאכול?|הודעות|1|כללי|3|A2
slang|texting|TBH|אם להיות כן|To Be Honest|האמת היא ש...|TBH, I didn't like the movie.|אם להיות כן, לא אהבתי את הסרט.|הודעות ורשתות|1|כללי|3|B1
slang|texting|BRB|תיכף חוזר|Be Right Back|יוצא לרגע וחוזר|BRB, someone's at the door.|תיכף חוזר, מישהו בדלת.|צ'אט והודעות|1|כללי|2|A2
slang|abbr|FYI|לידיעתך|For Your Information|מעדכן אותך במשהו|FYI, the store closes early today.|לידיעתך, החנות נסגרת מוקדם היום.|עבודה והודעות|2|כללי|3|B1
slang|social|IRL|בחיים האמיתיים|In Real Life|לא באינטרנט, במציאות|We met online, but never IRL.|הכרנו ברשת, אבל אף פעם לא במציאות.|רשתות חברתיות|1|כללי|2|B1
slang|social|DM|הודעה פרטית|Direct Message|לשלוח הודעה בפרטי|DM me the details.|שלח לי את הפרטים בפרטי.|אינסטגרם, טיקטוק, X|1|כללי|3|A2
slang|texting|TTYL|נדבר אחר כך|Talk To You Later|מסיים שיחה|Gotta go, TTYL!|חייב לזוז, נדבר אחר כך!|הודעות|1|כללי|2|A2
slang|texting|NGL|לא אשקר|Not Gonna Lie|בכנות|NGL, that pizza was amazing.|לא אשקר, הפיצה הזאת הייתה מדהימה.|הודעות ורשתות|1|כללי|2|B1
slang|work|ASAP|בהקדם האפשרי|As Soon As Possible|דחוף, כמה שיותר מהר|Please send it ASAP.|בבקשה שלח את זה בהקדם.|עבודה|2|כללי|3|A2
slang|work|OOO|מחוץ למשרד|Out Of Office|לא זמין בעבודה|I'm OOO until Monday.|אני מחוץ למשרד עד יום שני.|מיילים בעבודה|2|כללי|2|B1
slang|dating|Ghosting|להיעלם בלי להגיב|להפוך לרוח רפאים|להפסיק לענות למישהו פתאום, בלי הסבר|He stopped answering. I think he's ghosting me.|הוא הפסיק לענות. נראה לי שהוא נעלם לי.|דייטים וחברויות|1|כללי|3|B1
slang|social|Cringe|מביך|להתכווץ (מבושה)|משהו שגורם לאי־נעימות ומבוכה|His dance moves were so cringe.|הריקוד שלו היה כל כך מביך.|רשתות ודיבור צעיר|1|כללי|3|B1
slang|daily|Vibe|אווירה, תחושה|רטט|האווירה או האנרגיה של מקום או אדם|I love the vibe of this place.|אני אוהב את האווירה של המקום הזה.|דיבור יומיומי|1|כללי|3|A2
slang|daily|Chill|רגוע, להירגע|קור|נינוח ורגוע, או בקשה להירגע|Chill, it's not a big deal.|תירגע, זה לא סיפור גדול.|דיבור יומיומי|1|כללי|3|A2
expr|expr|My bad|טעות שלי|הרע שלי|סליחה, זו אשמתי|My bad, I forgot to call you.|טעות שלי, שכחתי להתקשר אליך.|דיבור יומיומי|1|כללי|3|A2
expr|expr|I'm down|אני בעניין|אני למטה|אני מסכים ורוצה להצטרף|Pizza tonight? I'm down!|פיצה הערב? אני בעניין!|בין חברים|1|ארה"ב|3|B1
expr|expr|Hit me up|תשלח לי הודעה|תכה אותי|תתקשר או תשלח לי הודעה|Hit me up when you're free.|תשלח לי הודעה כשאתה פנוי.|בין חברים|1|ארה"ב|3|B1
slang|social|Lowkey|בשקט, קצת|בטון נמוך|משהו שמרגישים אבל לא מכריזים עליו|I'm lowkey excited about the trip.|אני בשקט די מתרגש מהטיול.|דיבור צעיר|1|ארה"ב|3|B1
slang|social|Highkey|לגמרי, בגלוי|בטון גבוה|בצורה ברורה ובלי להסתיר|I highkey love this song.|אני לגמרי אוהב את השיר הזה.|דיבור צעיר|1|ארה"ב|2|B1
slang|daily|Flex|להשוויץ|לכווץ שריר|להתהדר במשהו כדי שיקנאו|He's just flexing his new car.|הוא סתם משוויץ באוטו החדש שלו.|רשתות ודיבור|1|כללי|3|B1
slang|daily|Hype|התלהבות, באזז|הייפ|התרגשות וציפייה גדולה לקראת משהו|The hype for this movie is crazy.|ההייפ סביב הסרט הזה מטורף.|דיבור ורשתות|1|כללי|3|B1
slang|daily|Fire|אש, מעולה|אש|משהו מדהים ומצוין|This song is fire!|השיר הזה אש!|דיבור צעיר|1|ארה"ב|3|A2
slang|american|Dope|מגניב|סם|מגניב, מעולה|Your new shoes are dope.|הנעליים החדשות שלך מגניבות.|דיבור צעיר|1|ארה"ב|2|B1
slang|social|GOAT|הגדול מכולם|עז|Greatest Of All Time, הטוב ביותר אי פעם|Messi is the GOAT.|מסי הוא הגדול מכולם.|ספורט ורשתות|1|כללי|3|B1
slang|social|Sus|חשוד|קיצור של suspicious|משהו או מישהו שנראה חשוד|That guy is acting kinda sus.|הבחור הזה מתנהג קצת חשוד.|דיבור צעיר ומשחקים|1|כללי|3|B1
slang|daily|Salty|ממורמר, נעלב|מלוח|נעלב או מבואס ממשהו קטן|He's still salty about losing.|הוא עדיין ממורמר על ההפסד.|דיבור יומיומי|1|ארה"ב|2|B2
slang|friends|Spill the tea|ספר את הרכילות|לשפוך את התה|לספר רכילות או סוד|Come on, spill the tea! What happened?|יאללה, ספר את הרכילות! מה קרה?|בין חברים|1|ארה"ב|2|B2
slang|friends|Bet|סגור|הימור|סגור, בסדר, מסכים|See you at eight? Bet.|נתראה בשמונה? סגור.|בין חברים|1|ארה"ב|2|B1
slang|social|Cap|שקר|כובע|שקר או הגזמה|That's cap, you never met him.|זה שקר, אף פעם לא פגשת אותו.|דיבור צעיר|1|ארה"ב|2|B2
slang|social|No cap|בלי שקר, ברצינות|בלי כובע|אני אומר את האמת|No cap, this is the best burger ever.|ברצינות, זה ההמבורגר הכי טוב שיש.|דיבור צעיר|1|ארה"ב|3|B2
slang|social|Slay|לקרוע, להצליח בגדול|לקטול|לעשות משהו מעולה או להיראות מדהים|You slayed that presentation!|קרעת את המצגת הזאת!|דיבור צעיר|1|כללי|3|B1
slang|british|Cheers|תודה, לחיים|לחיים|בבריטניה: תודה או ביי|Cheers, mate!|תודה, אחי!|בריטניה, יומיומי|1|בריטניה|3|A2
slang|british|Mate|חבר, אחי|בן לוויה|פנייה חברית למישהו|How are you, mate?|מה שלומך, אחי?|בריטניה ואוסטרליה|1|בריטניה|3|A2
slang|british|Gutted|מבואס לגמרי|מרוקן מבפנים|מאוכזב מאוד|I was gutted when we lost.|הייתי מבואס לגמרי כשהפסדנו.|בריטניה|1|בריטניה|2|B2
slang|british|Knackered|גמור מעייפות|תשוש|עייף מאוד|I'm knackered after work.|אני גמור אחרי העבודה.|בריטניה|1|בריטניה|2|B2
slang|dating|Crush|דלוק על מישהו|מעיכה|אהבה או משיכה למישהו|I have a crush on her.|אני דלוק עליה.|דייטים וחברים|1|כללי|3|A2
slang|dating|Red flag|דגל אדום|דגל אדום|סימן אזהרה במערכת יחסים|Lying to you is a big red flag.|לשקר לך זה דגל אדום גדול.|דייטים ורשתות|1|כללי|3|B1
slang|work|Touch base|להתעדכן, ליצור קשר|לגעת בבסיס|לדבר בקצרה כדי להתעדכן|Let's touch base next week.|בוא נתעדכן בשבוע הבא.|עבודה|2|כללי|2|B2
slang|work|Wrap up|לסכם, לסיים|לעטוף|לסיים פגישה או משימה|Let's wrap up the meeting.|בוא נסכם את הפגישה.|עבודה|2|כללי|3|B1
spoken|spoken|gonna|הולך ל־ (going to)|going to|מתכנן לעשות משהו|I'm gonna call you later.|אני אתקשר אליך אחר כך.|דיבור מהיר|1|כללי|3|A2
spoken|spoken|wanna|רוצה ל־ (want to)|want to|רוצה|Do you wanna grab lunch?|רוצה לאכול צהריים?|דיבור מהיר|1|כללי|3|A2
spoken|spoken|gotta|חייב (got to)|have got to|חייב לעשות משהו|I gotta go, see you!|אני חייב לזוז, נתראה!|דיבור מהיר|1|כללי|3|A2
spoken|spoken|kinda|די, סוג של (kind of)|kind of|במידה מסוימת|I'm kinda tired today.|אני די עייף היום.|דיבור מהיר|1|כללי|3|A2
spoken|spoken|lemme|תן לי (let me)|let me|תן לי לעשות משהו|Lemme check my calendar.|תן לי לבדוק ביומן.|דיבור מהיר|1|כללי|3|A2
spoken|spoken|dunno|לא יודע (don't know)|don't know|לא יודע|I dunno, maybe tomorrow.|לא יודע, אולי מחר.|דיבור מהיר|1|כללי|3|A2
spoken|spoken|You good?|אתה בסדר?|אתה טוב?|לבדוק שמישהו בסדר|You good? You look tired.|אתה בסדר? אתה נראה עייף.|בין חברים|1|ארה"ב|3|A2
spoken|spoken|What's up?|מה קורה?|מה למעלה?|ברכה: מה נשמע|Hey, what's up?|היי, מה קורה?|ברכה יומיומית|1|כללי|3|A1
spoken|spoken|I'm in|אני בפנים, אני מצטרף|אני בפנים|אני משתתף|A movie tonight? I'm in!|סרט הערב? אני בפנים!|בין חברים|1|כללי|3|A2
spoken|spoken|You in?|אתה בא? אתה בעניין?|אתה בפנים?|שאלה אם מישהו מצטרף|We're going out tonight. You in?|אנחנו יוצאים הערב. אתה בא?|בין חברים|1|כללי|2|A2
phrasal|phrasal|give up|לוותר, להתייאש|לתת למעלה|להפסיק לנסות|Don't give up, you're almost there!|אל תוותר, אתה כמעט שם!|כללי|2|כללי|3|A2
phrasal|phrasal|figure out|להבין, לפצח|לדמות החוצה|למצוא פתרון או להבין משהו|I can't figure out this problem.|אני לא מצליח לפצח את הבעיה הזאת.|כללי|2|כללי|3|B1
phrasal|phrasal|hang out|לבלות, להסתובב|לתלות בחוץ|לבלות זמן עם חברים|We hang out every weekend.|אנחנו מבלים יחד כל סוף שבוע.|בין חברים|1|כללי|3|A2
phrasal|phrasal|run into|להיתקל במישהו|לרוץ לתוך|לפגוש מישהו במקרה|I ran into my teacher at the mall.|נתקלתי במורה שלי בקניון.|כללי|2|כללי|3|B1
phrasal|phrasal|look after|לשמור על, לטפל ב־|להסתכל אחרי|לדאוג למישהו או למשהו|Can you look after my dog this weekend?|אתה יכול לשמור על הכלב שלי בסוף השבוע?|כללי|2|כללי|3|B1
phrasal|phrasal|work out|להתאמן / להסתדר|לעבוד החוצה|להתאמן בכושר, או שמשהו יסתדר|I work out three times a week.|אני מתאמן שלוש פעמים בשבוע.|כללי|2|כללי|3|A2
phrasal|phrasal|come up with|להמציא, להעלות רעיון|לבוא למעלה עם|לחשוב על רעיון חדש|She came up with a great idea.|היא העלתה רעיון מעולה.|כללי|2|כללי|3|B1
phrasal|phrasal|find out|לגלות|למצוא החוצה|לקבל מידע חדש|I found out the truth yesterday.|גיליתי את האמת אתמול.|כללי|2|כללי|3|A2
phrasal|phrasal|put off|לדחות|לשים הצידה|לדחות משהו לזמן מאוחר יותר|Stop putting off your homework.|תפסיק לדחות את שיעורי הבית.|כללי|2|כללי|3|B1
phrasal|phrasal|look forward to|לצפות בקוצר רוח ל־|להסתכל קדימה אל|לחכות בהתרגשות למשהו|I'm looking forward to the holiday.|אני מחכה בקוצר רוח לחופשה.|גם במיילים|2|כללי|3|B1
phrasal|phrasal|turn down|לסרב, להנמיך|לסובב למטה|לדחות הצעה, או להנמיך עוצמה|She turned down the job offer.|היא סירבה להצעת העבודה.|כללי|2|כללי|3|B1
phrasal|phrasal|catch up|להשלים פערים, להתעדכן|לתפוס למעלה|לפגוש מישהו ולהתעדכן, או להשלים חומר|Let's catch up over coffee.|בוא ניפגש לקפה ונתעדכן.|כללי|2|כללי|3|B1
idiom|idiom|Break the ice|לשבור את הקרח|לשבור את הקרח|להפיג מתח בתחילת מפגש|He told a joke to break the ice.|הוא סיפר בדיחה כדי לשבור את הקרח.|מפגשים חדשים|2|כללי|3|B1
idiom|idiom|Piece of cake|קלי קלות|חתיכת עוגה|משהו קל מאוד|The test was a piece of cake.|המבחן היה קלי קלות.|יומיומי|1|כללי|3|A2
idiom|idiom|Under the weather|לא מרגיש טוב|מתחת למזג האוויר|קצת חולה|I'm feeling a bit under the weather.|אני מרגיש קצת לא טוב.|יומיומי|2|כללי|3|B1
idiom|idiom|Hit the nail on the head|קלעת בדיוק|להכות במסמר על הראש|לומר בדיוק את הדבר הנכון|You hit the nail on the head.|קלעת בדיוק למטרה.|יומיומי ועבודה|2|כללי|2|B2
idiom|idiom|Cost an arm and a leg|עולה הון|עולה יד ורגל|יקר מאוד|That car cost an arm and a leg.|האוטו הזה עלה הון.|יומיומי|1|כללי|3|B1
idiom|idiom|Once in a blue moon|פעם ביובל|פעם בירח כחול|לעיתים רחוקות מאוד|I eat fast food once in a blue moon.|אני אוכל ג'אנק פוד פעם ביובל.|יומיומי|2|כללי|2|B2
idiom|idiom|The ball is in your court|הכדור בידיים שלך|הכדור במגרש שלך|עכשיו ההחלטה שלך|I made my offer. The ball is in your court.|הצעתי את ההצעה שלי. הכדור בידיים שלך.|עבודה ויומיומי|2|כללי|2|B2
idiom|idiom|Call it a day|לסיים להיום|לקרוא לזה יום|להפסיק לעבוד להיום|We're tired, let's call it a day.|אנחנו עייפים, בוא נסיים להיום.|עבודה|2|כללי|3|B1
idiom|idiom|Spill the beans|לגלות סוד|לשפוך את השעועית|לחשוף סוד, לפעמים בטעות|Who spilled the beans about the party?|מי גילה את הסוד על המסיבה?|יומיומי|1|כללי|2|B1
idiom|idiom|On cloud nine|ברקיע השביעי|על ענן תשע|מאושר מאוד|She's been on cloud nine since the wedding.|היא ברקיע השביעי מאז החתונה.|יומיומי|1|כללי|2|B2
idiom|idiom|Hit the sack|ללכת לישון|להכות בשק|ללכת לישון|I'm tired, I'm gonna hit the sack.|אני עייף, אני הולך לישון.|יומיומי|1|כללי|2|B1
idiom|idiom|Bite the bullet|לנשוך שפתיים ולעשות|לנשוך את הכדור|לעשות משהו לא נעים שאין ממנו מנוס|I bit the bullet and called the bank.|נשכתי שפתיים והתקשרתי לבנק.|יומיומי|2|כללי|2|B2
expr|expr|No worries|אין בעיה, הכול טוב|בלי דאגות|תשובה ל"תודה" או ל"סליחה"|Sorry I'm late! No worries.|סליחה שאיחרתי! אין בעיה.|יומיומי|1|כללי|3|A2
expr|expr|Fair enough|הוגן, מקובל עליי|הוגן מספיק|אני מקבל את הנימוק|You were busy? Fair enough.|היית עסוק? מקובל.|יומיומי|2|כללי|3|B1
expr|expr|It's up to you|זה תלוי בך|זה למעלה אליך|ההחלטה שלך|Pizza or sushi? It's up to you.|פיצה או סושי? אתה מחליט.|יומיומי|2|כללי|3|A2
expr|expr|I'm on my way|אני בדרך|אני על הדרך שלי|אני כבר יוצא ומגיע|I'm on my way, see you in ten.|אני בדרך, נתראה בעוד עשר דקות.|יומיומי|2|כללי|3|A1
expr|expr|Never mind|לא משנה|אף פעם לא אכפת|עזוב, זה לא חשוב|Never mind, I found it.|לא משנה, מצאתי.|יומיומי|2|כללי|3|A2
expr|expr|Long time no see|מזמן לא התראינו|זמן ארוך לא לראות|ברכה למישהו שלא ראית הרבה זמן|Long time no see! How are you?|מזמן לא התראינו! מה שלומך?|יומיומי|1|כללי|3|A2
expr|expr|Sounds good|נשמע טוב|נשמע טוב|מסכים להצעה|Lunch at one? Sounds good.|צהריים באחת? נשמע טוב.|יומיומי וגם עבודה|2|כללי|3|A1
expr|expr|Take care|שמור על עצמך|קח זהירות|ברכת פרידה חמה|Bye, take care!|ביי, שמור על עצמך!|יומיומי|2|כללי|3|A1
expr|expr|Make yourself at home|תרגיש כמו בבית|תעשה את עצמך בבית|הזמנה לאורח להרגיש בנוח|Come in, make yourself at home.|תיכנס, תרגיש כמו בבית.|אירוח|2|כללי|2|A2
expr|expr|Give me a sec|שנייה, רגע|תן לי שנייה|בקשה לחכות רגע קצר|Give me a sec, I'm almost ready.|שנייה, אני כמעט מוכן.|יומיומי|1|כללי|3|A2
expr|expr|I have no idea|אין לי מושג|אין לי רעיון|אני בכלל לא יודע|Where is he? I have no idea.|איפה הוא? אין לי מושג.|יומיומי|2|כללי|3|A2
expr|expr|I'm good, thanks|לא תודה, אני מסודר|אני טוב, תודה|דרך מנומסת לסרב להצעה|More coffee? I'm good, thanks.|עוד קפה? לא תודה, אני מסודר.|יומיומי|2|כללי|3|A2`;


  const PLACEMENT = [
    { q: 'I ___ a student.', o: ['am', 'is', 'are', 'be'], a: 0, lvl: 'A1' },
    { q: 'מה התרגום של "apple"?', o: ['תפוח', 'בננה', 'לחם', 'מים'], a: 0, lvl: 'A1' },
    { q: 'Yesterday we ___ to the beach.', o: ['go', 'went', 'gone', 'going'], a: 1, lvl: 'A2' },
    { q: 'She ___ coffee every morning.', o: ['drink', 'drinks', 'drinking', 'drunk'], a: 1, lvl: 'A2' },
    { q: 'If it rains, we ___ at home.', o: ['stay', 'will stay', 'stayed', 'would have stayed'], a: 1, lvl: 'B1' },
    { q: 'מה הפירוש של "I\'m exhausted"?', o: ['אני מותש', 'אני רעב', 'אני משועמם', 'אני מתרגש'], a: 0, lvl: 'B1' },
    { q: 'I have lived here ___ 2015.', o: ['since', 'for', 'from', 'at'], a: 0, lvl: 'B2' },
    { q: 'מה הפירוש של "under the weather"?', o: ['קצת חולה', 'בחוץ בגשם', 'שמח מאוד', 'עסוק מאוד'], a: 0, lvl: 'B2' },
    { q: 'Had I known, I ___ earlier.', o: ['would have come', 'will come', 'came', 'had come'], a: 0, lvl: 'C1' },
    { q: 'מה הפירוש של "ubiquitous"?', o: ['נמצא בכל מקום', 'נדיר מאוד', 'מסוכן', 'שקט'], a: 0, lvl: 'C1' }
  ];

  /* AI tutor scenarios — used by the local (offline) tutor. Gemini uses only the title/role. */
  const SCENARIOS = [
    { id: 'free', he: 'שיחה חופשית', icon: '💬', role: 'a friendly English conversation partner', steps: [] },
    { id: 'restaurant', he: 'מסעדה', icon: '🍝', role: 'a waiter in a restaurant', steps: [
      ['Hi, welcome! Table for how many people?', 'היי, ברוכים הבאים! שולחן לכמה אנשים?'],
      ['Great, follow me please. Here is the menu. Can I get you something to drink?', 'מעולה, בואו אחריי בבקשה. הנה התפריט. אפשר להביא לכם משהו לשתות?'],
      ['Are you ready to order, or do you need a few more minutes?', 'אתם מוכנים להזמין, או שאתם צריכים עוד כמה דקות?'],
      ['Good choice! Are you allergic to anything?', 'בחירה טובה! אתם אלרגיים למשהו?'],
      ['How is everything? Do you like the food?', 'איך הכול? אתם אוהבים את האוכל?'],
      ['Would you like to see the dessert menu?', 'תרצו לראות את תפריט הקינוחים?'],
      ['Here is the bill. Will you pay by card or cash?', 'הנה החשבון. תשלמו בכרטיס או במזומן?']] },
    { id: 'airport', he: 'שדה תעופה', icon: '✈️', role: 'a check-in agent at the airport', steps: [
      ['Good morning! Where are you flying today?', 'בוקר טוב! לאן אתה טס היום?'],
      ['Can I see your passport, please?', 'אפשר לראות את הדרכון שלך, בבקשה?'],
      ['Thank you. How many bags are you checking in?', 'תודה. כמה מזוודות אתה שולח?'],
      ['Did you pack your bags yourself?', 'ארזת את המזוודות בעצמך?'],
      ['Would you prefer a window seat or an aisle seat?', 'אתה מעדיף מושב ליד החלון או ליד המעבר?'],
      ['Here is your boarding pass. Your gate is B12. Is there anything else I can help with?', 'הנה כרטיס העלייה למטוס. השער שלך B12. יש עוד משהו שאפשר לעזור?']] },
    { id: 'hotel', he: 'מלון', icon: '🏨', role: 'a hotel receptionist', steps: [
      ['Hello and welcome! Do you have a reservation?', 'שלום וברוכים הבאים! יש לך הזמנה?'],
      ['Perfect. How many nights will you stay with us?', 'מושלם. כמה לילות תשהה אצלנו?'],
      ['Would you like breakfast included?', 'תרצה שארוחת בוקר תהיה כלולה?'],
      ['Your room is on the fifth floor. Do you need help with your luggage?', 'החדר שלך בקומה החמישית. אתה צריך עזרה עם המזוודות?'],
      ['Is there anything else you need for your stay?', 'יש עוד משהו שאתה צריך לשהות שלך?']] },
    { id: 'interview', he: 'ראיון עבודה', icon: '🧑‍💼', role: 'a job interviewer', steps: [
      ['Thanks for coming in today. Can you tell me a little about yourself?', 'תודה שהגעת היום. תוכל לספר לי קצת על עצמך?'],
      ['Why do you want to work for our company?', 'למה אתה רוצה לעבוד בחברה שלנו?'],
      ['What are your biggest strengths?', 'מה החוזקות הגדולות שלך?'],
      ['Tell me about a challenge you faced at work and how you solved it.', 'ספר לי על אתגר שהתמודדת איתו בעבודה ואיך פתרת אותו.'],
      ['Where do you see yourself in five years?', 'איפה אתה רואה את עצמך בעוד חמש שנים?'],
      ['Do you have any questions for us?', 'יש לך שאלות אלינו?']] },
    { id: 'work', he: 'עבודה', icon: '💼', role: 'a friendly colleague at work', steps: [
      ['Morning! How was your weekend?', 'בוקר! איך היה הסופ"ש?'],
      ['Are you ready for the meeting today?', 'אתה מוכן לפגישה היום?'],
      ['What are you working on this week?', 'על מה אתה עובד השבוע?'],
      ['Do you need any help with the deadline?', 'אתה צריך עזרה עם הדדליין?'],
      ['Want to grab lunch together later?', 'רוצה לאכול צהריים ביחד אחר כך?']] },
    { id: 'travel', he: 'טיול', icon: '🧳', role: 'a friendly local you meet while traveling', steps: [
      ['Hi! Are you visiting here? Where are you from?', 'היי! אתה מבקר כאן? מאיפה אתה?'],
      ['How long are you staying?', 'כמה זמן אתה נשאר?'],
      ['What have you seen so far?', 'מה ראית עד עכשיו?'],
      ['Do you like the food here?', 'אתה אוהב את האוכל כאן?'],
      ['You should visit the old town. Do you want some tips?', 'כדאי לך לבקר בעיר העתיקה. רוצה כמה טיפים?']] },
    { id: 'date', he: 'דייט', icon: '🌹', role: 'a person on a first date', steps: [
      ['Hi! It\'s so nice to finally meet you. How was your day?', 'היי! כל כך נחמד סוף סוף להכיר. איך היה היום שלך?'],
      ['So, what do you like to do in your free time?', 'אז מה אתה אוהב לעשות בזמן הפנוי?'],
      ['Have you traveled anywhere interesting?', 'טיילת במקום מעניין?'],
      ['What kind of music do you like?', 'איזו מוזיקה אתה אוהב?'],
      ['This was fun. Would you like to meet again?', 'היה כיף. תרצה להיפגש שוב?']] },
    { id: 'smalltalk', he: 'Small Talk', icon: '☕', role: 'a neighbor making small talk', steps: [
      ['Hey! Nice weather today, isn\'t it?', 'היי! מזג אוויר נחמד היום, לא?'],
      ['Any plans for the weekend?', 'יש תוכניות לסופ"ש?'],
      ['Have you watched anything good lately?', 'ראית משהו טוב לאחרונה?'],
      ['How is work going?', 'איך הולך בעבודה?']] },
    { id: 'shopping', he: 'קניות', icon: '🛍️', role: 'a sales assistant in a clothing store', steps: [
      ['Hi there! Can I help you find something?', 'היי! אפשר לעזור לך למצוא משהו?'],
      ['What size are you looking for?', 'איזו מידה אתה מחפש?'],
      ['Would you like to try it on? The fitting rooms are over there.', 'תרצה למדוד? חדרי ההלבשה שם.'],
      ['How does it fit?', 'איך זה יושב עליך?'],
      ['Great! Will that be cash or card?', 'מעולה! מזומן או כרטיס?']] },
    { id: 'phone', he: 'שיחת טלפון', icon: '📞', role: 'a receptionist answering the phone at a clinic', steps: [
      ['Good afternoon, City Clinic. How can I help you?', 'צהריים טובים, מרפאת העיר. איך אפשר לעזור?'],
      ['Sure. Can I have your full name, please?', 'בטח. אפשר את שמך המלא, בבקשה?'],
      ['What is the reason for your visit?', 'מה סיבת הביקור?'],
      ['We have an opening on Tuesday at 10 AM. Does that work for you?', 'יש לנו תור פנוי ביום שלישי בעשר בבוקר. זה מתאים לך?'],
      ['Great, you\'re all set. Is there anything else?', 'מעולה, הכול מסודר. יש עוד משהו?']] }
  ];

  const FREE_QUESTIONS = [
    ['What did you do today?', 'מה עשית היום?'],
    ['What is your favorite food?', 'מה האוכל האהוב עליך?'],
    ['Where would you like to travel next?', 'לאן היית רוצה לטייל בפעם הבאה?'],
    ['What do you do for work or study?', 'במה אתה עובד או מה אתה לומד?'],
    ['What kind of movies or series do you like?', 'איזה סרטים או סדרות אתה אוהב?'],
    ['What do you usually do on weekends?', 'מה אתה בדרך כלל עושה בסופי שבוע?'],
    ['Why do you want to improve your English?', 'למה אתה רוצה לשפר את האנגלית שלך?'],
    ['Tell me about your best friend.', 'ספר לי על החבר הכי טוב שלך.'],
    ['What is the best trip you have ever taken?', 'מה הטיול הכי טוב שעשית?'],
    ['Do you like sports? Which ones?', 'אתה אוהב ספורט? איזה?'],
    ['What is something new you learned recently?', 'מה משהו חדש שלמדת לאחרונה?'],
    ['If you could live anywhere, where would it be?', 'אם היית יכול לגור בכל מקום, איפה זה היה?']
  ];

  const GOALS = [
    { id: 'conversation', he: 'שיחה' }, { id: 'travel', he: 'טיולים' }, { id: 'work', he: 'עבודה' },
    { id: 'interviews', he: 'ראיונות' }, { id: 'studies', he: 'לימודים' }, { id: 'vocab', he: 'אוצר מילים' },
    { id: 'reading', he: 'קריאה' }, { id: 'listening', he: 'שמיעה' }, { id: 'slang', he: 'סלנג' },
    { id: 'movies', he: 'סרטים וסדרות' }, { id: 'all', he: 'הכול' }
  ];

  const INTERESTS = [
    { id: 'tech', he: 'טכנולוגיה', cats: ['tech'], read: ['tech', 'science'] }, { id: 'nature', he: 'טבע', cats: ['nature'], read: ['nature', 'science'] },
    { id: 'sports', he: 'ספורט', cats: ['sports', 'health'], read: ['sports'] }, { id: 'finance', he: 'פיננסים', cats: ['finance'], read: ['finance'] },
    { id: 'business', he: 'עסקים', cats: ['business', 'work'], read: ['business'] }, { id: 'food', he: 'אוכל', cats: ['food', 'restaurant'], read: ['culture', 'lifestyle'] },
    { id: 'travel', he: 'טיולים', cats: ['travel', 'airport', 'hotel'], read: ['travel'] }, { id: 'entertainment', he: 'בידור', cats: ['daily'], read: ['entertainment'] },
    { id: 'culture', he: 'תרבות', cats: ['daily'], read: ['culture'] }, { id: 'relationships', he: 'זוגיות', cats: ['relationships', 'family'], read: ['lifestyle'] },
    { id: 'news', he: 'חדשות', cats: ['work', 'daily'], read: ['news'] }
  ];

  /* Reading topics (real articles, collected by tools/fetch-articles.mjs) */
  const READ_CATS = [
    { id: 'news', he: 'חדשות', icon: '📰' }, { id: 'tech', he: 'טכנולוגיה', icon: '💻' }, { id: 'science', he: 'מדע', icon: '🔬' },
    { id: 'sports', he: 'ספורט', icon: '⚽' }, { id: 'business', he: 'עסקים', icon: '📈' }, { id: 'finance', he: 'פיננסים', icon: '💰' },
    { id: 'nature', he: 'טבע', icon: '🌿' }, { id: 'culture', he: 'תרבות', icon: '🎨' }, { id: 'entertainment', he: 'בידור', icon: '🎬' },
    { id: 'travel', he: 'טיולים', icon: '🧳' }, { id: 'lifestyle', he: 'Lifestyle', icon: '🧘' }
  ];

  window.APP_DATA = { CATEGORIES, CAT_ALIAS, WORDS, EXPRESSIONS, PLACEMENT, SCENARIOS, FREE_QUESTIONS, GOALS, INTERESTS, READ_CATS };
})();
