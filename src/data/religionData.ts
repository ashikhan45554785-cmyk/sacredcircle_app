import { ReligionType } from '../types';

export interface ReligionConfig {
  name: string;
  symbol: string;
  accColor: string;
  rawHex: string;
  darkHex: string;
  lightHex: string;
  bgHex: string;
  
  // Theme styles for class binding
  bgClass: string;          // Page background
  cardBgClass: string;      // Card background
  borderClass: string;      // Borders
  textClass: string;        // Primary brand text
  btnClass: string;         // Main action buttons
  pillClass: string;        // Active badge/pills
  trackColor: string;       // Color for progress/bars

  prayers: Array<{ id: string; name: string; time: string }>;
  devs: Array<{ id: string; word: string; arabic?: string; meaning: string }>;
  
  // Clean, warm wording (avoiding "devotion" or technical words)
  prayerLabel: string;
  devLabel: string;
  counterTitle: string;
  graphTitle: string;
  faithLabel: string;
  devTotalLabel: string;
  breakdownTitle: string;
  navLabel: string;
  quote: string;
}

export const RC: Record<ReligionType, ReligionConfig> = {
  muslim: {
    name: 'Islam',
    symbol: '☪️',
    accColor: 'emerald',
    rawHex: '#1D9E75',
    darkHex: '#0B4F39',
    lightHex: '#E1F5EE',
    bgHex: '#FAFDFB',
    
    // Emerald Theme Config
    bgClass: 'bg-[#F2FAF7]',
    cardBgClass: 'bg-white border-emerald-100/60',
    borderClass: 'border-emerald-100',
    textClass: 'text-emerald-800',
    btnClass: 'bg-gradient-to-r from-emerald-700 to-emerald-600 hover:from-emerald-600 hover:to-emerald-500 text-white shadow-emerald-700/10',
    pillClass: 'bg-emerald-50 text-emerald-700 border-emerald-200/50',
    trackColor: 'from-emerald-500 to-emerald-700',

    prayers: [
      { id: 'fajr', name: 'Fajr', time: 'Dawn Prayer' },
      { id: 'dhuhr', name: 'Dhuhr', time: 'Noon Prayer' },
      { id: 'asr', name: 'Asr', time: 'Afternoon Prayer' },
      { id: 'maghrib', name: 'Maghrib', time: 'Sunset Prayer' },
      { id: 'isha', name: 'Isha', time: 'Night Prayer' }
    ],
    devs: [
      { id: 'subhanallah', word: 'SubhanAllah', arabic: 'سبحان الله', meaning: 'Glory be to Allah' },
      { id: 'alhamdulillah', word: 'Alhamdulillah', arabic: 'الحمد لله', meaning: 'Praise be to Allah' },
      { id: 'allahu_akbar', word: 'Allahu Akbar', arabic: 'الله أكبر', meaning: 'Allah is the Greatest' },
      { id: 'astaghfirullah', word: 'Astaghfirullah', arabic: 'أستغفر الله', meaning: 'I seek forgiveness' },
      { id: 'la_ilaha', word: 'La ilaha illallah', arabic: 'لا إله إلا الله', meaning: 'No god but Allah' },
    ],
    prayerLabel: "Today's Sacred Prayers",
    devLabel: "Dhikr / Remembrance Counter",
    counterTitle: "Chanting Sanctuary",
    graphTitle: "Faith Alignment Index",
    faithLabel: "Faith Level",
    devTotalLabel: "Total Dhikr Today",
    breakdownTitle: "Remembrance Breakdown",
    navLabel: "Dhikr",
    quote: '"By remembering Allah, hearts find rest and beautiful closeness."'
  },
  christian: {
    name: 'Christianity',
    symbol: '✝️',
    accColor: 'blue',
    rawHex: '#2A72B5',
    darkHex: '#143859',
    lightHex: '#EBF3FA',
    bgHex: '#FAFBFD',
    
    // Heavenly Blue Theme Config
    bgClass: 'bg-[#F2F6FA]',
    cardBgClass: 'bg-white border-blue-100/60',
    borderClass: 'border-blue-100',
    textClass: 'text-blue-800',
    btnClass: 'bg-gradient-to-r from-blue-700 to-blue-600 hover:from-blue-600 hover:to-blue-500 text-white shadow-blue-700/10',
    pillClass: 'bg-blue-50 text-blue-700 border-blue-200/50',
    trackColor: 'from-blue-500 to-blue-700',

    prayers: [
      { id: 'morning', name: 'Morning Prayer & Readings', time: 'Morning Reflection' },
      { id: 'noon', name: 'Noon Devotional', time: 'Midday Prayer' },
      { id: 'evening', name: 'Evening Lord Prayer', time: 'Sunset Reflection' },
    ],
    devs: [
      { id: 'lords_prayer', word: "Lord's Prayer", meaning: 'Our Father in heaven, hallowed be Your name...' },
      { id: 'jesus_prayer', word: 'Jesus Prayer', meaning: 'Lord Jesus Christ, Son of God, have mercy on me.' },
      { id: 'glory_be', word: 'Glory Be', meaning: 'Glory be to the Father, and to the Son, and to the Holy Spirit...' },
      { id: 'hail_mary', word: 'Hail Mary', meaning: 'Full of grace, the Lord is with thee...' },
      { id: 'hallelujah', word: 'Hallelujah Chants', meaning: 'Chant of pure joy and praise to the Lord' },
    ],
    prayerLabel: 'Daily Prayer & Readings',
    devLabel: 'Repetitive Prayer Counter',
    counterTitle: "Prayer Ring Sanctuary",
    graphTitle: 'Faith Alignment Index',
    faithLabel: 'Faith Level',
    devTotalLabel: 'Total Prayers Today',
    breakdownTitle: 'Prayer Bead Breakdown',
    navLabel: 'Prayers',
    quote: '"Let us help each other to love and keep going in wonderful deeds."'
  },
  hindu: {
    name: 'Hinduism',
    symbol: '🕉️',
    accColor: 'amber',
    rawHex: '#CD7B0E',
    darkHex: '#6E4004',
    lightHex: '#FBF4E7',
    bgHex: '#FDFBFA',
    
    // Warm Saffron/Amber Theme Config
    bgClass: 'bg-[#FDF7F0]',
    cardBgClass: 'bg-white border-amber-100/60',
    borderClass: 'border-amber-100',
    textClass: 'text-amber-800',
    btnClass: 'bg-gradient-to-r from-amber-700 to-amber-600 hover:from-amber-600 hover:to-amber-500 text-white shadow-amber-700/10',
    pillClass: 'bg-amber-50 text-amber-700 border-amber-200/50',
    trackColor: 'from-amber-500 to-amber-700',

    prayers: [
      { id: 'pratah', name: 'Prātas Sandhyā (Dawn)', time: 'Morning Puja' },
      { id: 'madhyan', name: 'Mādhyāhnika (Noon)', time: 'Midday Meditation' },
      { id: 'puja', name: 'Evening Sandhyā / Arati', time: 'Sunset Worship' },
      { id: 'temple', name: 'Sacred Gita Reading', time: 'Flexible Hours' },
    ],
    devs: [
      { id: 'om', word: 'Om Mantra', arabic: 'ॐ', meaning: 'The eternal primordial sound of the cosmos' },
      { id: 'om_namah', word: 'Om Namah Shivaya', arabic: 'ॐ नमः शिवाय', meaning: 'I bow to the Divine Light within Shiva' },
      { id: 'hare_krishna', word: 'Hare Krishna Mahamantra', arabic: 'हरे कृष्ण', meaning: 'Chant of supreme love, peace, and soul liberation' },
      { id: 'gayatri', word: 'Gayatri Mantra', arabic: 'ॐ भूर्भुवः स्वः', meaning: 'Rigveda mantra of solar illumination and intellectual light' },
      { id: 'om_shanti', word: 'Om Shanti', arabic: 'ॐ शान्ति', meaning: 'Universal peace for all living beings' },
    ],
    prayerLabel: 'Rituals & Puja alignment',
    devLabel: 'Mala Chanting Beads',
    counterTitle: "Mala beads Sanctuary",
    graphTitle: 'Dharma Alignment Index',
    faithLabel: 'Dharma Alignment',
    devTotalLabel: 'Total Mantras Chanted',
    breakdownTitle: 'Mantra Breakdown',
    navLabel: 'Mantras',
    quote: '"Let noble thoughts come to us from all directions for our spiritual elevation."'
  }
};
