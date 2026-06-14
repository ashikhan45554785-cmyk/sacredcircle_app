import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Heart, Sparkles, RotateCcw, Calendar, 
  LogOut, ChevronRight, BookOpen, Clock, 
  BarChart3, Settings, ArrowRight, Save
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ReligionType, ModeType, Member, ChantingSession, CustomPrayer } from './types';
import { RC } from './data/religionData';
import { ShieldLogo } from './components/ShieldLogo';
import { FaithGraph } from './components/FaithGraph';

// ══════════════════════════════════════
//  SUPABASE CLIENT FOR LIVE REAL-TIME ROOM SYNCING
// ══════════════════════════════════════
const SB_URL = 'https://luqmoatjdpdpywkfpqki.supabase.co';
const SB_KEY = 'sb_publishable_sKBQSiUypiepCsqGWM37pw_onOAS_1u';
const sb = createClient(SB_URL, SB_KEY);

export default function App() {
  // Navigation / screen states
  const [screen, setScreen] = useState<'intro' | 'religion' | 'mode' | 'auth' | 'dashboard'>('intro');
  const [religion, setReligion] = useState<ReligionType>('muslim');
  const [mode, setMode] = useState<ModeType>('individual');
  const [activeTab, setActiveTab] = useState<'prayers' | 'dhikr' | 'insights' | 'calendar' | 'settings'>('prayers');

  // Unified sync states
  const [member, setMember] = useState<Member | null>(null);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [roomName, setRoomName] = useState<string | null>(null);
  const [partner, setPartner] = useState<Member | null>(null);

  // Prayer logs & chanting values
  const [prayers, setPrayers] = useState<Record<string, 'done' | 'missed' | 'none'>>({});
  const [devCounts, setDevCounts] = useState<Record<string, number>>({});
  const [sessionsHistory, setSessionsHistory] = useState<ChantingSession[]>([]);
  const [customPrayers, setCustomPrayers] = useState<CustomPrayer[]>([]);
  
  // Beads chanting variables
  const [ctrVal, setCtrVal] = useState<number>(0);
  const [activeDev, setActiveDev] = useState<any>(null);
  const [customDevInput, setCustomDevInput] = useState<string>('');
  const [particles, setParticles] = useState<{ id: number; x: number; y: number; color: string }[]>([]);

  // UI elements
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [isNewRoomTab, setIsNewRoomTab] = useState<boolean>(true);
  
  // Custom prayer modal inputs
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [newPrayerName, setNewPrayerName] = useState<string>('');
  const [newPrayerPos, setNewPrayerPos] = useState<string>('after_last');

  // Auth form values
  const [authName, setAuthName] = useState<string>('');
  const [authEmail, setAuthEmail] = useState<string>('');
  const [authPass, setAuthPass] = useState<string>('');
  const [authRoomName, setAuthRoomName] = useState<string>('');
  const [authRoomCode, setAuthRoomCode] = useState<string>('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(false);

  // Synced rooms leaderboard list
  const [roomMembersData, setRoomMembersData] = useState<any[]>([]);
  const [weeklyHistoryScores, setWeeklyHistoryScores] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);
  const [showInsightsGraph, setShowInsightsGraph] = useState<boolean>(false);

  const getLocalTodayString = (dateObj: Date = new Date()) => {
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getTodayString = () => getLocalTodayString();

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  };

  // ══════════════════════════════════════
  //  1. CHANTING AUTO-SAVE BEFORE LEAVING TAB
  // ══════════════════════════════════════
  const handleTabChange = (targetTab: 'prayers' | 'dhikr' | 'insights' | 'calendar' | 'settings') => {
    if (activeTab === 'dhikr' && ctrVal > 0) {
      // Auto-save any pending chant count
      saveChantSessionDirectly(ctrVal);
      showToast(`Auto-saved remembrance iterations (+${ctrVal})`);
    }
    setActiveTab(targetTab);
  };

  // Rehydrate session on mount
  useEffect(() => {
    const rawLocalSession = localStorage.getItem('sc_session');
    if (rawLocalSession) {
      try {
        const sess = JSON.parse(rawLocalSession);
        setReligion(sess.rel || 'muslim');
        setMode(sess.mode || 'individual');
        setRoomCode(sess.roomCode || null);
        setRoomName(sess.roomName || null);
        if (sess.memberId) {
          setMember({
            id: sess.memberId,
            room_code: sess.roomCode || null,
            name: sess.name || 'User',
            email: sess.email || null,
            role: sess.role || 'member'
          });
        } else {
          setMember({ id: 9999, room_code: null, name: 'Guest', email: null });
        }
        setScreen('dashboard');
      } catch (err) {
        console.error("Local session rehydration failed", err);
      }
    }
  }, []);

  // Set default active preset phrase when religion changes
  useEffect(() => {
    const rc = RC[religion];
    setActiveDev(rc.devs[0]);
    setCtrVal(0);
    setPrayers({});
    setDevCounts({});
    setSessionsHistory([]);
    loadTodayProgress();
  }, [religion, member]);

  // Real-time synchronization interval for Couple/Group room tracking
  useEffect(() => {
    if (screen === 'dashboard') {
      syncLeaderboardAndGraph();
    }
    let interval: any = null;
    if (screen === 'dashboard' && roomCode && member && member.id !== 9999) {
      interval = setInterval(() => {
        syncLeaderboardAndGraph();
      }, 7000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [screen, roomCode, member, prayers, devCounts, religion]);

  // Load persistence for prayers and chants
  const loadTodayProgress = async () => {
    const today = getTodayString();
    
    // Load custom prayers
    const storedCP = localStorage.getItem(`sc_cp_${religion}`);
    if (storedCP) {
      setCustomPrayers(JSON.parse(storedCP));
    } else {
      setCustomPrayers([]);
    }

    // Load local today backup
    const localTodayState = localStorage.getItem(`sc_offline_${religion}_${today}`);
    if (localTodayState) {
      try {
        const loaded = JSON.parse(localTodayState);
        if (loaded.prayers) setPrayers(loaded.prayers);
        if (loaded.devCounts) setDevCounts(loaded.devCounts);
        if (loaded.sessionsHistory) setSessionsHistory(loaded.sessionsHistory);
      } catch(e){}
    }

    // Fetch from live database if Room Syncing is active
    if (member && member.id !== 9999) {
      try {
        // Prayers
        const { data: pd, error: pe } = await sb
          .from('prayers')
          .select('*')
          .eq('member_id', member.id)
          .eq('prayer_date', today);

        if (pd && !pe) {
          const prayerState: Record<string, 'done' | 'missed' | 'none'> = {};
          pd.forEach(p => {
            prayerState[p.prayer_id] = p.status;
          });
          setPrayers(prev => ({ ...prev, ...prayerState }));
        }

        // Chants
        const { data: dd, error: de } = await sb
          .from('devotions')
          .select('*')
          .eq('member_id', member.id)
          .eq('devotion_date', today);

        if (dd && !de) {
          const counts: Record<string, number> = {};
          const loadedSessions: ChantingSession[] = [];
          dd.forEach(d => {
            counts[d.word] = (counts[d.word] || 0) + d.count;
            loadedSessions.push({
              word: d.word,
              count: d.count,
              time: new Date(d.logged_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            });
          });
          setDevCounts(counts);
          setSessionsHistory(loadedSessions.reverse());
        }

        // Fetch partner details for Couple Mode
        if (roomCode && mode === 'couple') {
          const { data: partners } = await sb
            .from('members')
            .select('*')
            .eq('room_code', roomCode)
            .neq('id', member.id);
          
          if (partners && partners.length > 0) {
            setPartner(partners[0]);
          }
        }
        
        await syncLeaderboardAndGraph();
      } catch (err) {
        console.warn("Using offline repository.");
      }
    }
  };

  // Compile daily scores and real-time leaderboard values
  const syncLeaderboardAndGraph = async () => {
    if (!member) return;
    const scores: number[] = [];
    const dateKeys: string[] = [];
    
    // Construct last 7 calendar days
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dateKeys.push(getLocalTodayString(d));
    }

    try {
      // 1. Calculate historical trend
      for (const day of dateKeys) {
        let doneCount = 0;
        let dtot = 0;
        let dbSuccess = false;
        
        if (member.id !== 9999) {
          try {
            const { data: pd } = await sb.from('prayers').select('status').eq('member_id', member.id).eq('prayer_date', day);
            const { data: dd } = await sb.from('devotions').select('count').eq('member_id', member.id).eq('devotion_date', day);
            
            if (pd) {
              doneCount = pd.filter(p => p.status === 'done').length;
              dbSuccess = true;
            }
            if (dd) {
              dtot = dd.reduce((acc, current) => acc + current.count, 0);
              dbSuccess = true;
            }
          } catch (dbErr) {
            console.warn("DB historical fetch error", dbErr);
          }
        }

        // Fallback to local storage for guest mode or offline error conditions
        if (!dbSuccess) {
          const localStateRaw = localStorage.getItem(`sc_offline_${religion}_${day}`);
          if (localStateRaw) {
            try {
              const loaded = JSON.parse(localStateRaw);
              const localPrs = loaded.prayers || {};
              doneCount = Object.values(localPrs).filter(s => s === 'done').length;
              const localDevs = loaded.devCounts || {};
              dtot = Object.values(localDevs).reduce((acc: number, current: any) => acc + (typeof current === 'number' ? current : 0), 0);
            } catch (e) {
              console.warn("Error reading offline fallback progress", e);
            }
          }
        }

        const totalPrs = RC[religion].prayers.length + customPrayers.length;
        const pScore = totalPrs > 0 ? (doneCount / totalPrs) * 70 : 0;
        const dScore = Math.min(dtot / 100, 1) * 30;
        scores.push(Math.round(pScore + dScore));
      }
      setWeeklyHistoryScores(scores);

      // 2. Fetch Sync Leaderboard if joined in shared Room
      if (roomCode && member.id !== 9999) {
        const { data: rMembers } = await sb.from('members').select('*').eq('room_code', roomCode);
        if (rMembers) {
          const today = getTodayString();
          const scoreRows = [];
          for (const m of rMembers) {
            const { data: pList } = await sb.from('prayers').select('status').eq('member_id', m.id).eq('prayer_date', today);
            const { data: dList } = await sb.from('devotions').select('count').eq('member_id', m.id).eq('devotion_date', today);
            
            const done = pList ? pList.filter(p => p.status === 'done').length : 0;
            const devT = dList ? dList.reduce((a, b) => a + b.count, 0) : 0;
            const total = RC[religion].prayers.length + customPrayers.length;
            
            const pPct = total > 0 ? (done / total) * 70 : 0;
            const dPct = Math.min(devT / 100, 1) * 30;
            
            scoreRows.push({
              id: m.id,
              name: m.name,
              score: Math.round(pPct + dPct),
              prayersDone: done,
              devTotal: devT
            });
          }
          setRoomMembersData(scoreRows.sort((a, b) => b.score - a.score));
        }
      }
    } catch (e) {
      console.warn("Synced values locally.", e);
    }
  };

  // ══════════════════════════════════════
  //  AUTH ROOM ESTABLISHMENT HANDLERS
  // ══════════════════════════════════════
  const handleCreateRoom = async () => {
    if (!authName || !authEmail || !authPass || !authRoomName) {
      setAuthError('All inputs are strictly required.');
      return;
    }
    if (authPass.length < 6) {
      setAuthError('Access password must be at least 6 characters.');
      return;
    }
    setAuthLoading(true);
    setAuthError(null);

    // Generate unique short room code
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let codeStr = 'SC-';
    for (let i = 0; i < 4; i++) codeStr += chars[Math.floor(Math.random() * chars.length)];

    try {
      // Insert Room mapping
      const { error: re } = await sb.from('rooms').insert({
        code: codeStr,
        name: authRoomName,
        religion,
        mode
      });
      if (re) throw re;

      // Insert active profile member
      const { data: md, error: me } = await sb
        .from('members')
        .insert({
          room_code: codeStr,
          name: authName.trim(),
          email: authEmail.trim()
        })
        .select()
        .single();
      if (me) throw me;

      const payload = {
        memberId: md.id,
        roomCode: codeStr,
        roomName: authRoomName,
        rel: religion,
        mode,
        name: authName.trim(),
        email: authEmail.trim(),
        role: mode === 'couple' ? 'husband' : 'member'
      };
      localStorage.setItem('sc_session', JSON.stringify(payload));
      setMember(md);
      setRoomCode(codeStr);
      setRoomName(authRoomName);
      
      showToast('Sacred sanctuary established successfully!');
      setScreen('dashboard');
    } catch (err: any) {
      setAuthError(`Encountered error: ${err.message || err}`);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!authName || !authEmail || !authPass || !authRoomCode) {
      setAuthError('Please fill in code and profile parameters.');
      return;
    }
    const cleanCode = authRoomCode.trim().toUpperCase();
    setAuthLoading(true);
    setAuthError(null);

    try {
      const { data: room, error: re } = await sb
        .from('rooms')
        .select('*')
        .eq('code', cleanCode)
        .single();
      
      if (re || !room) {
        setAuthError('The room code you typed is incorrect or does not exist.');
        setAuthLoading(false);
        return;
      }

      setReligion(room.religion);
      setMode(room.mode);

      // Lookup or sign up as room member
      const { data: ext } = await sb
        .from('members')
        .select('*')
        .eq('room_code', cleanCode)
        .eq('email', authEmail.trim())
        .maybeSingle();

      let activeMember = ext;
      if (!ext) {
        const { data: newMem, error: me } = await sb
          .from('members')
          .insert({
            room_code: cleanCode,
            name: authName.trim(),
            email: authEmail.trim()
          })
          .select()
          .single();
        if (me) throw me;
        activeMember = newMem;
      }

      const payload = {
        memberId: activeMember.id,
        roomCode: cleanCode,
        roomName: room.name,
        rel: room.religion,
        mode: room.mode,
        name: authName.trim(),
        email: authEmail.trim(),
        role: room.mode === 'couple' ? 'wife' : 'member'
      };
      localStorage.setItem('sc_session', JSON.stringify(payload));
      setMember(activeMember);
      setRoomCode(cleanCode);
      setRoomName(room.name);

      showToast(`Welcome back to ${room.name}!`);
      setScreen('dashboard');
    } catch (err: any) {
      setAuthError(`Sync error: ${err.message || err}`);
    } finally {
      setAuthLoading(false);
    }
  };

  const skipToGuestMode = () => {
    setMode('individual');
    const md = { id: 9999, room_code: null, name: 'Guest Brother/Sister', email: null };
    setMember(md);
    localStorage.setItem('sc_session', JSON.stringify({
      memberId: 9999,
      roomCode: null,
      roomName: null,
      rel: religion,
      mode: 'individual',
      name: 'Guest seeker',
      email: null
    }));
    setScreen('dashboard');
  };

  const handleSignOut = () => {
    if (ctrVal > 0) {
      saveChantSessionDirectly(ctrVal);
    }
    localStorage.removeItem('sc_session');
    setMember(null);
    setRoomCode(null);
    setRoomName(null);
    setPartner(null);
    setScreen('religion');
  };

  // ══════════════════════════════════════
  //  LITURGY & PRAYER FLOWS
  // ══════════════════════════════════════
  const cyclePrayerState = async (pId: string) => {
    const today = getTodayString();
    const curVal = prayers[pId] || 'none';
    let nextVal: 'done' | 'missed' | 'none' = 'done';
    if (curVal === 'done') nextVal = 'missed';
    else if (curVal === 'missed') nextVal = 'none';

    const updatedPrayers = { ...prayers, [pId]: nextVal };
    setPrayers(updatedPrayers);
    
    const offlineBackupKey = `sc_offline_${religion}_${today}`;
    localStorage.setItem(offlineBackupKey, JSON.stringify({ prayers: updatedPrayers, devCounts, sessionsHistory }));

    if (member && member.id !== 9999) {
      try {
        const pName = [...RC[religion].prayers, ...customPrayers].find(pa => pa.id === pId)?.name || pId;
        await sb.from('prayers').upsert({
          member_id: member.id,
          room_code: roomCode,
          prayer_date: today,
          prayer_id: pId,
          prayer_name: pName,
          status: nextVal
        }, { onConflict: 'member_id,prayer_date,prayer_id' });
        syncLeaderboardAndGraph();
      } catch (e) {
        console.warn("Logged locally.");
      }
    }
  };

  const markAllPrayers = async (status: 'done' | 'missed') => {
    const today = getTodayString();
    const list = [...RC[religion].prayers, ...customPrayers];
    const updated: Record<string, 'done' | 'missed' | 'none'> = { ...prayers };
    list.forEach(p => {
      updated[p.id] = status;
    });
    setPrayers(updated);

    localStorage.setItem(`sc_offline_${religion}_${today}`, JSON.stringify({ prayers: updated, devCounts, sessionsHistory }));

    if (member && member.id !== 9999) {
      try {
        for (const p of list) {
          await sb.from('prayers').upsert({
            member_id: member.id,
            room_code: roomCode,
            prayer_date: today,
            prayer_id: p.id,
            prayer_name: p.name,
            status
          }, { onConflict: 'member_id,prayer_date,prayer_id' });
        }
        syncLeaderboardAndGraph();
      } catch (e) {}
    }
    showToast(`All schedules set to ${status === 'done' ? 'completed' : 'missed'}`);
  };

  const handleAddCustomPrayer = () => {
    if (!newPrayerName.trim()) {
      showToast('Name is empty!');
      return;
    }
    const newId = `custom_${Date.now()}`;
    const item: CustomPrayer = {
      id: newId,
      name: newPrayerName.trim(),
      time: 'Custom study hour'
    };

    const updated = [...customPrayers, item];
    setCustomPrayers(updated);
    localStorage.setItem(`sc_cp_${religion}`, JSON.stringify(updated));
    setNewPrayerName('');
    setShowAddModal(false);
    showToast(`"${item.name}" registered successfully.`);
  };

  // ══════════════════════════════════════
  //  CHANT / PHRASE ITERATOR CONTROLS
  // ══════════════════════════════════════
  const triggerBeadPulse = (e: React.MouseEvent<HTMLButtonElement>) => {
    setCtrVal(prev => prev + 1);

    // Particles trigger coordinates
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Warm colorful particles customizable based on path color
    const rc = RC[religion];
    const colors = [rc.rawHex, '#FFFDF5', '#EBCB86', '#C99831'];
    const newList = Array.from({ length: 4 }).map(() => ({
      id: Math.random(),
      x: x + (Math.random() * 50 - 25),
      y: y + (Math.random() * 50 - 25),
      color: colors[Math.floor(Math.random() * colors.length)]
    }));
    
    setParticles(prev => [...prev, ...newList].slice(-20));
  };

  const saveChantSession = () => {
    if (ctrVal === 0) {
      showToast("Tap the spherical counter beads first!");
      return;
    }
    saveChantSessionDirectly(ctrVal);
    showToast(`Saved ${ctrVal} iterations.`);
    setCtrVal(0);
    setCustomDevInput('');
  };

  const saveChantSessionDirectly = async (countToSave: number) => {
    const today = getTodayString();
    const activeLabel = activeDev ? activeDev.word : customDevInput || "Spiritual Chant";
    
    const currentCount = devCounts[activeLabel] || 0;
    const updatedCounts = { ...devCounts, [activeLabel]: currentCount + countToSave };
    setDevCounts(updatedCounts);

    const timestr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const sessionObj: ChantingSession = { word: activeLabel, count: countToSave, time: timestr };
    const updatedHistory = [sessionObj, ...sessionsHistory];
    setSessionsHistory(updatedHistory);

    // Save locally
    localStorage.setItem(`sc_offline_${religion}_${today}`, JSON.stringify({ 
      prayers, 
      devCounts: updatedCounts, 
      sessionsHistory: updatedHistory 
    }));

    // Save database
    if (member && member.id !== 9999) {
      try {
        await sb.from('devotions').insert({
          member_id: member.id,
          room_code: roomCode,
          devotion_date: today,
          word: activeLabel,
          count: countToSave
        });
        syncLeaderboardAndGraph();
      } catch (e) {
        console.warn("Cached locally.");
      }
    }
  };

  // Pre-calculated variables for layout
  const rc = RC[religion];
  const listTodayPrayers = [...rc.prayers, ...customPrayers];
  const countTodayPrayed = Object.keys(prayers).filter(k => prayers[k] === 'done' && listTodayPrayers.some(p => p.id === k)).length;
  const countTodayMissed = Object.keys(prayers).filter(k => prayers[k] === 'missed' && listTodayPrayers.some(p => p.id === k)).length;
  const devTodayTotal = Object.values(devCounts).reduce((a, b) => a + b, 0);

  // Compute overall percentage score
  const calculateFaithScore = () => {
    const divisor = listTodayPrayers.length;
    const ritualPoints = divisor > 0 ? (countTodayPrayed / divisor) * 70 : 0;
    const devotionPoints = Math.min(devTodayTotal / 100, 1) * 30; // Max out 100 counts
    return Math.round(ritualPoints + devotionPoints);
  };
  const currentFaithScore = calculateFaithScore();

  return (
    <div className={`min-h-screen ${rc.bgClass} text-slate-800 flex flex-col items-center selection:bg-amber-100 selection:text-amber-800 overflow-x-hidden pb-24 font-sans`}>
      
      {/* Exquisite minimal float Toast notifier */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div 
            initial={{ opacity: 0, y: 50, x: "-50%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className="fixed bottom-24 left-1/2 transform -translate-x-1/2 z-50 bg-slate-900 border border-amber-500/30 text-amber-200 px-6 py-3.5 rounded-2xl shadow-2xl flex items-center gap-2 text-xs font-bold font-mono tracking-wider"
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>{toastMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════
          10-SECOND CINEMATIC LOGO INTRO
         ══════════════════════════════════════ */}
      {screen === 'intro' && (
        <div className="fixed inset-0 bg-[#070A0F] flex flex-col items-center justify-center z-50 p-6 overflow-hidden">
          {/* Celestial background stars */}
          <div className="absolute inset-0 opacity-30 pointer-events-none">
            {Array.from({ length: 40 }).map((_, i) => (
              <div 
                key={i} 
                className="absolute rounded-full bg-white animate-pulse"
                style={{
                  width: `${Math.random() * 3}px`,
                  height: `${Math.random() * 3}px`,
                  top: `${Math.random() * 100}%`,
                  left: `${Math.random() * 100}%`,
                  animationDuration: `${2 + Math.random() * 5}s`
                }}
              />
            ))}
          </div>

          <div className="relative text-center max-w-lg flex flex-col items-center gap-6">
            <motion.div
              initial={{ scale: 0.1, opacity: 0, rotate: -40 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              transition={{ duration: 1.2, ease: "easeOut" }}
            >
              <ShieldLogo className="w-56 h-56 md:w-64 md:h-64" animate={true} />
            </motion.div>

            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.7, duration: 0.9 }}
              className="mt-2"
            >
              <h1 className="text-3xl md:text-5xl font-extrabold text-[#F4E9CE] font-serif tracking-[4px]">
                SACRED CIRCLE
              </h1>
              <p className="mt-3 text-xs md:text-sm text-slate-400 leading-relaxed max-w-xs mx-auto italic font-medium">
                One Humanity · One Heart
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.4, duration: 0.8 }}
            >
              <button 
                onClick={() => setScreen('religion')} 
                className="px-8 py-4 bg-gradient-to-r from-amber-600 to-amber-500 text-white font-bold rounded-full shadow-lg shadow-amber-900/40 hover:scale-105 active:scale-95 transition-all text-xs uppercase tracking-widest cursor-pointer mt-4 flex items-center gap-2"
              >
                Enter Sanctuary <ArrowRight className="w-4 h-4" />
              </button>
            </motion.div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════
          RELIGION SELECTION (Emerald, Sky, Saffron)
         ══════════════════════════════════════ */}
      {screen === 'religion' && (
        <div className="w-full max-w-md px-6 py-12 flex flex-col items-center">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex flex-col items-center text-center mt-6"
          >
            <ShieldLogo className="w-24 h-24" animate={false} />
            <span className="text-3xs tracking-[4px] uppercase text-amber-600/70 font-black mt-4">HUMAN SACRED CIRCLE</span>
            <h2 className="text-2xl font-black text-slate-900 font-serif mt-2 tracking-wide">Choose Your Spiritual Path</h2>
            <p className="text-xs text-slate-400 mt-2 max-w-xs leading-relaxed">
              Experience customized liturgy, rosaries, malas, and remembrance counters mapped specifically to your religion while fostering unity.
            </p>
          </motion.div>

          <div className="w-64 h-[2px] bg-slate-200/80 rounded-full flex my-6 overflow-hidden">
            <div className="bg-[#1D9E75] flex-1"></div>
            <div className="bg-[#2A72B5] flex-1"></div>
            <div className="bg-[#CD7B0E] flex-1"></div>
          </div>

          <div className="w-full space-y-4">
            {[
              { id: 'muslim', title: 'Islam', desc: '5 Prayer Times · Dhikr Counter · Iman Pace', icon: '☪️', hoverClass: 'hover:border-emerald-400 hover:bg-emerald-50/10' },
              { id: 'christian', title: 'Christianity', desc: 'Liturgy Readings · Repetitive Prayers · Faith Pace', icon: '✝️', hoverClass: 'hover:border-blue-400 hover:bg-blue-50/10' },
              { id: 'hindu', title: 'Hinduism', desc: 'Daily Sandhya Puja · Mantra Counter · Dharma Pace', icon: '🕉️', hoverClass: 'hover:border-amber-400 hover:bg-amber-50/10' }
            ].map((rel) => (
              <button
                key={rel.id}
                onClick={() => {
                  setReligion(rel.id as ReligionType);
                  setScreen('mode');
                }}
                className={`w-full text-left p-5 bg-white border border-slate-150 rounded-2xl flex items-center gap-4 transition-all hover:scale-[1.01] hover:shadow-md cursor-pointer group ${rel.hoverClass}`}
              >
                <div className="text-4xl translate-y-0.5">{rel.icon}</div>
                <div>
                  <h4 className="font-extrabold text-slate-800 text-base">{rel.title}</h4>
                  <p className="text-3xs text-slate-400 mt-1">{rel.desc}</p>
                </div>
                <ChevronRight className="w-4 h-4 ml-auto text-slate-300 group-hover:text-slate-600 transition-colors" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════
          MODE SELECTION
         ══════════════════════════════════════ */}
      {screen === 'mode' && (
        <div className="w-full max-w-md px-6 py-12 flex flex-col items-center">
          <button onClick={() => setScreen('religion')} className="self-start text-xs text-slate-400 hover:text-slate-600 mb-6 font-medium bg-slate-200/40 px-3.5 py-1.5 rounded-full flex items-center gap-1 transition-colors">
            ← Back to Paths
          </button>

          <div className="text-center flex flex-col items-center">
            <span className="text-4xl">{RC[religion].symbol}</span>
            <span className="text-3xs uppercase tracking-[3px] text-amber-600 font-black mt-2">{RC[religion].name} path</span>
            <h3 className="text-xl font-bold font-serif text-slate-900 mt-1">Select Ritual Mode</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-xs leading-relaxed">Choose whether log records remain private or synchronize with high-fidelity shared circles.</p>
          </div>

          <div className="w-full space-y-4 mt-8">
            <button
              onClick={() => {
                setMode('individual');
                skipToGuestMode();
              }}
              className="w-full text-left p-5 bg-white border border-slate-150 rounded-2xl flex items-center gap-4 hover:scale-[1.01] hover:shadow-md transition-all cursor-pointer group hover:border-amber-500/40"
            >
              <div className="text-3xl bg-slate-50 p-3 rounded-xl">🧘</div>
              <div>
                <h4 className="font-bold text-slate-800 text-sm">Individual Spiritual Path</h4>
                <p className="text-3xs text-slate-400 mt-0.5">Keep counts of prayers and lists on your private device.</p>
              </div>
            </button>

            <button
              onClick={() => {
                setMode('couple');
                setScreen('auth');
              }}
              className="w-full text-left p-5 bg-white border border-slate-150 rounded-2xl flex items-center gap-4 hover:scale-[1.01] hover:shadow-md transition-all cursor-pointer group hover:border-[#DFB35A]/50"
            >
              <div className="text-3xl bg-slate-50 p-3 rounded-xl">💑</div>
              <div>
                <h4 className="font-bold text-slate-800 text-sm">Couple Harmony Track</h4>
                <p className="text-3xs text-slate-400 mt-0.5">Invite your husband/wife. Intimate side-by-side sync.</p>
              </div>
            </button>

            <button
              onClick={() => {
                setMode('group');
                setScreen('auth');
              }}
              className="w-full text-left p-5 bg-white border border-slate-150 rounded-2xl flex items-center gap-4 hover:scale-[1.01] hover:shadow-md transition-all cursor-pointer group hover:border-[#DFB35A]/50"
            >
              <div className="text-3xl bg-slate-50 p-3 rounded-xl">🤲</div>
              <div>
                <h4 className="font-bold text-slate-800 text-sm">Family & Friends Circle</h4>
                <p className="text-3xs text-slate-400 mt-0.5">Shared room to motivate and review overall group logs.</p>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════
          AUTHENTICATION / ROOM RECONCILIATION
         ══════════════════════════════════════ */}
      {screen === 'auth' && (
        <div className="w-full max-w-md px-6 py-12">
          <button onClick={() => setScreen('mode')} className="text-xs text-slate-400 hover:text-slate-600 mb-6 font-medium bg-slate-200/40 px-3.5 py-1.5 rounded-full inline-block">
            ← Change Mode
          </button>

          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xl">
            <div className="text-center mb-6">
              <span className="text-3xl">{rc.symbol}</span>
              <h3 className="text-lg font-bold text-slate-800 mt-1">
                {isNewRoomTab ? `Set Up Room Sanctuary` : 'Join Extent Room'}
              </h3>
              <p className="text-3xs text-slate-400 mt-1">
                {isNewRoomTab ? 'Establish a secure code to map together' : 'Align scores by typing access code directly'}
              </p>
            </div>

            {/* Toggle tabs */}
            <div className="grid grid-cols-2 bg-slate-50 p-1.5 rounded-xl border border-slate-150 mb-5 text-xs font-bold uppercase tracking-wider">
              <button 
                onClick={() => { setIsNewRoomTab(true); setAuthError(null); }}
                className={`py-2 rounded-lg transition-all cursor-pointer ${isNewRoomTab ? 'bg-white shadow-sm text-slate-800 border border-slate-100' : 'text-slate-400'}`}
              >
                Create Room
              </button>
              <button 
                onClick={() => { setIsNewRoomTab(false); setAuthError(null); }}
                className={`py-2 rounded-lg transition-all cursor-pointer ${!isNewRoomTab ? 'bg-white shadow-sm text-slate-800 border border-slate-100' : 'text-slate-400'}`}
              >
                Join with Code
              </button>
            </div>

            {authError && (
              <div className="p-3 mb-4 bg-red-50 border border-red-150 rounded-xl text-3xs text-red-600 font-bold uppercase tracking-wide leading-relaxed">
                {authError}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-4xs text-slate-400 font-black uppercase tracking-wider mb-1">Your Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. Fatima / John"
                  value={authName}
                  onChange={e => setAuthName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-amber-500 transition-colors font-medium text-slate-705"
                />
              </div>

              <div>
                <label className="block text-4xs text-slate-400 font-black uppercase tracking-wider mb-1">Email Account</label>
                <input 
                  type="email" 
                  placeholder="you@domain.com"
                  value={authEmail}
                  onChange={e => setAuthEmail(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-amber-500 transition-colors font-medium text-slate-705"
                />
              </div>

              <div>
                <label className="block text-4xs text-slate-400 font-black uppercase tracking-wider mb-1">Secure Password</label>
                <input 
                  type="password" 
                  placeholder="••••••••"
                  value={authPass}
                  onChange={e => setAuthPass(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-amber-500 transition-colors font-semibold"
                />
              </div>

              {isNewRoomTab ? (
                <div>
                  <label className="block text-4xs text-slate-400 font-black uppercase tracking-wider mb-1">Room Title</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Hope Sanctuary"
                    value={authRoomName}
                    onChange={e => setAuthRoomName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-amber-500 transition-colors font-medium"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-4xs text-slate-400 font-black uppercase tracking-wider mb-1">4-Character Room Code</label>
                  <input 
                    type="text" 
                    placeholder="e.g. SC-A3F2"
                    value={authRoomCode}
                    onChange={e => setAuthRoomCode(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-center text-sm font-bold tracking-[3px] focus:outline-none focus:border-amber-500 transition-colors uppercase text-slate-800"
                  />
                </div>
              )}

              <button
                onClick={isNewRoomTab ? handleCreateRoom : handleJoinRoom}
                disabled={authLoading}
                className="w-full py-3 bg-slate-900 border border-slate-800 text-white hover:bg-slate-800 text-3xs font-extrabold uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer mt-3"
              >
                {authLoading ? 'Aligning circle...' : isNewRoomTab ? 'Establish Sanctuary' : 'Sync Sanctuary'}
              </button>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100 text-center">
              <button onClick={skipToGuestMode} className="text-3xs text-slate-400 hover:text-slate-600 underline font-bold uppercase tracking-wider">
                Continue Offline (Private Local Storage)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════
          THE HIGH-FIDELITY MAIN DASHBOARD
         ══════════════════════════════════════ */}
      {screen === 'dashboard' && (
        <div className="w-full max-w-md min-h-screen flex flex-col items-center">
          
          {/* Header Bar */}
          <header className="sticky top-0 left-0 right-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-slate-100 px-6 py-4.5 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-white text-xs font-black shadow-md">
                SC
              </div>
              <span className="text-sm font-black tracking-[2.5px] text-slate-800 font-mono">SACRED CIRCLE</span>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-10/10 px-3.5 py-1 rounded-full border border-slate-150 text-slate-600">
              <span className="text-sm">{rc.symbol}</span>
              <span className="text-4xs uppercase tracking-widest font-black">{rc.name}</span>
            </div>
          </header>

          <div className="w-full px-4 pt-4 flex flex-col gap-4">
            
            <div className="text-center my-1.5">
              <span className="text-4xs text-slate-400 tracking-[3px] uppercase font-black block mb-0.5">Spiritual Stream Pace</span>
              <p className="text-xs text-slate-600 font-medium">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            </div>

            {/* Room sync active badge */}
            {roomCode && (
              <div className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-2.5">
                  <div className="text-xl">🏡</div>
                  <div>
                    <h5 className="text-xs font-extrabold text-slate-700">{roomName}</h5>
                    <p className="text-3xs text-slate-400 font-extrabold tracking-widest leading-normal">
                      ROOM KEY: <span className="font-bold select-all">{roomCode}</span> • {(roomMembersData.length || 1)} {((roomMembersData.length || 1) === 1 ? 'MEMBER' : 'MEMBERS JOINED')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full border border-emerald-100/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-4xs font-black uppercase tracking-widest">Synced</span>
                </div>
              </div>
            )}

            {/* ══════════════ TAB PREFERENTIAL WRAPPERS ══════════════ */}
            
            {/* TAB 1: RITUALS / DAILY SCHEDULES */}
            {activeTab === 'prayers' && (
              <motion.div 
                initial={{ opacity: 0, y: 12 }} 
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col gap-4"
              >
                {/* Live Synced Room Connection Scoreboard on Home Dashboard */}
                {roomCode && (
                  <div className="bg-white border border-slate-150 rounded-3xl p-5 shadow-xs text-left relative overflow-hidden">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <span className="text-4xs font-black text-slate-400 uppercase tracking-[2px] block">Live Synchronization</span>
                        <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest mt-0.5">
                          {mode === 'couple' ? 'Partner Sync Status' : 'Room Leaderboard'}
                        </h4>
                      </div>
                      <span className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full border border-emerald-150/50 text-[9px] font-black uppercase tracking-wider">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span> SYNC ACTIVE
                      </span>
                    </div>

                    <div className="space-y-3">
                      {roomMembersData.map((rm, idx) => (
                        <div 
                          key={rm.id} 
                          className="flex items-center justify-between p-3.5 rounded-2xl border text-xs transition-all bg-slate-50/50 border-slate-150"
                          style={{
                            borderColor: rm.id === member?.id ? `${rc.rawHex}40` : '#f1f5f9',
                            backgroundColor: rm.id === member?.id ? `${rc.rawHex}05` : '#f8fafc'
                          }}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="text-sm select-none">
                              {mode === 'couple' ? '💑' : idx === 0 ? '🥇' : idx === 1 ? '🥈' : '✨'}
                            </span>
                            <span 
                              className="font-bold text-slate-800"
                              style={{ color: rm.id === member?.id ? rc.rawHex : '#1e293b' }}
                            >
                              {rm.name} {rm.id === member?.id && "(You)"}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest bg-white/80 border border-slate-100 px-2 py-0.5 rounded">
                              Done: {rm.prayersDone}
                            </span>
                            <span 
                              className="font-black text-xs bg-white px-2.5 py-1 rounded-full border shadow-2xs"
                              style={{ 
                                color: rc.rawHex, 
                                borderColor: `${rc.rawHex}20` 
                              }}
                            >
                              {rm.score}%
                            </span>
                          </div>
                        </div>
                      ))}

                      {roomMembersData.length < 2 && mode === 'couple' && (
                        <div 
                          className="p-4 rounded-2xl border border-dashed text-center mt-2"
                          style={{
                            borderColor: `${rc.rawHex}30`,
                            backgroundColor: `${rc.rawHex}03`
                          }}
                        >
                          <p className="text-xs font-bold text-slate-700">Waiting for partner to join...</p>
                          <p className="text-3xs text-slate-400 mt-1 uppercase tracking-wider leading-relaxed">
                            Share Room Key: <span className="font-mono font-bold" style={{ color: rc.rawHex }}>{roomCode}</span>
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between mt-2 px-0.5">
                  <h4 className="text-3xs font-extrabold uppercase tracking-widest text-slate-400">{rc.prayerLabel}</h4>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => markAllPrayers('done')} 
                      className="text-4xs bg-emerald-50 text-emerald-700 border border-emerald-150 hover:bg-emerald-100/60 px-3 py-1.5 rounded-full font-black uppercase tracking-wider cursor-pointer transition-colors"
                    >
                      ✓ All Done
                    </button>
                    <button 
                      onClick={() => markAllPrayers('missed')} 
                      className="text-4xs bg-red-50 text-red-700 border border-red-150 hover:bg-red-100/60 px-3 py-1.5 rounded-full font-black uppercase tracking-wider cursor-pointer transition-colors"
                    >
                      ✗ All Missed
                    </button>
                  </div>
                </div>

                {/* Liturgies schedule grid */}
                <div className="flex flex-col gap-3">
                  {listTodayPrayers.map((pray) => {
                    const st = prayers[pray.id] || 'none';
                    return (
                      <div 
                        key={pray.id}
                        onClick={() => cyclePrayerState(pray.id)}
                        className={`p-4 bg-white border rounded-2xl flex items-center justify-between shadow-xs transition-transform active:scale-[0.99] select-none cursor-pointer hover:border-slate-300 ${
                          st === 'done' ? 'border-emerald-500/80 bg-[#F5FCF9]' : 
                          st === 'missed' ? 'border-red-400 bg-[#FDF8F8]' : 'border-slate-150 shadow-none'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black ${
                            st === 'done' ? 'bg-emerald-100 text-emerald-800' : 
                            st === 'missed' ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-400'
                          }`}>
                            {st === 'done' ? '✓' : st === 'missed' ? '✗' : '•'}
                          </div>
                          <div>
                            <span className="font-extrabold text-slate-700 text-sm block leading-tight">{pray.name}</span>
                            <span className="text-4xs text-slate-400 uppercase tracking-widest font-black block mt-0.5">{pray.time}</span>
                          </div>
                        </div>

                        <div>
                          {st === 'done' && (
                            <span className="text-4xs uppercase tracking-widest font-extrabold text-emerald-800 bg-emerald-100/60 px-2.5 py-1 rounded-md">
                              Logged
                            </span>
                          )}
                          {st === 'missed' && (
                            <span className="text-4xs uppercase tracking-widest font-extrabold text-red-800 bg-red-100/60 px-2.5 py-1 rounded-md">
                              Skipped
                            </span>
                          )}
                          {st === 'none' && (
                            <span className="text-4xs uppercase tracking-widest font-extrabold text-slate-400 border border-slate-200 px-2.5 py-1 rounded-md hover:bg-slate-50 transition-colors">
                              Not Logged
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <button 
                  onClick={() => setShowAddModal(true)}
                  className="w-full mt-1.5 py-3.5 border-2 border-dashed border-slate-300 rounded-2xl hover:border-amber-500/50 hover:text-amber-700 text-slate-400 font-bold text-3xs uppercase tracking-widest transition-colors bg-white/40 cursor-pointer"
                >
                  ＋ Add Custom Liturgy Study
                </button>
              </motion.div>
            )}

            {/* TAB 2: REMEMBRANCE CHANT BEATER COUNTER */}
            {activeTab === 'dhikr' && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.98 }} 
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col gap-4 text-center mt-1"
              >
                <div className="bg-white border border-slate-150 rounded-3xl p-5 shadow-xs">
                  <h4 className="text-3xs font-extrabold text-slate-400 uppercase tracking-widest mb-3.5">
                    {rc.counterTitle}
                  </h4>

                  {/* Devotional presets */}
                  <div className="flex flex-wrap gap-1.5 justify-center mb-5">
                    {rc.devs.map((pres) => (
                      <button
                        key={pres.id}
                        onClick={() => {
                          if (ctrVal > 0) {
                            saveChantSessionDirectly(ctrVal);
                            showToast(`Saved previous ${ctrVal} chants.`);
                          }
                          setActiveDev(pres);
                          setCustomDevInput('');
                          setCtrVal(0);
                        }}
                        className={`px-3.5 py-1.5 rounded-full text-3xs font-black uppercase tracking-wider transition-all border ${
                          activeDev && activeDev.id === pres.id ? 
                          'bg-slate-900 text-white border-slate-900 shadow-sm' : 
                          'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100 cursor-pointer'
                        }`}
                      >
                        {pres.word}
                      </button>
                    ))}
                    <button
                      onClick={() => {
                        if (ctrVal > 0) {
                          saveChantSessionDirectly(ctrVal);
                          showToast(`Saved previous ${ctrVal} chants.`);
                        }
                        setActiveDev(null);
                        setCtrVal(0);
                      }}
                      className={`px-3.5 py-1.5 rounded-full text-3xs font-black uppercase tracking-wider transition-all border ${
                        activeDev === null ? 
                        'bg-slate-900 text-white border-slate-900 shadow-sm' : 
                        'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100 cursor-pointer'
                      }`}
                    >
                      Custom Phrase...
                    </button>
                  </div>

                  {activeDev === null && (
                    <input 
                      type="text"
                      placeholder="Type custom sacred phrase..."
                      value={customDevInput}
                      onChange={e => setCustomDevInput(e.target.value)}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-full text-center text-xs focus:outline-none focus:border-amber-500 transition-colors mb-5 font-bold"
                    />
                  )}

                  <div className="py-4 min-h-24 flex flex-col items-center justify-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-150 mb-4 px-3">
                    {activeDev && activeDev.arabic && (
                      <p 
                        className="text-2xl font-normal tracking-wide arabic-serif text-center mb-1.5 leading-snug"
                        style={{ color: rc.rawHex }}
                      >
                        {activeDev.arabic}
                      </p>
                    )}
                    <p 
                      className="text-xs font-black leading-tight uppercase tracking-widest"
                      style={{ color: rc.rawHex }}
                    >
                      {activeDev ? activeDev.word : customDevInput || "SILENT MINDFULNESS"}
                    </p>
                    <p className="text-3xs text-slate-400 mt-1 max-w-xs italic leading-relaxed font-semibold">
                      {activeDev ? activeDev.meaning : "Set your intention and complete repeats"}
                    </p>
                  </div>

                  {/* MINI GLOWING LED DIGITAL DISPLAY SCREEN */}
                  <div className="bg-slate-900 rounded-3xl p-5 border border-slate-800 shadow-2xl relative overflow-hidden max-w-xs mx-auto mb-6 text-left">
                    <div className="absolute top-1.5 right-3 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span className="text-[7px] font-mono text-emerald-400 font-extrabold uppercase tracking-widest">MINI DISPLAY</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-[7px] font-mono font-black text-slate-400 uppercase tracking-widest block leading-none mb-1">ITERATIONS</span>
                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl font-mono font-bold tracking-tight text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]">
                            {String(ctrVal).padStart(3, '0')}
                          </span>
                          <span className="text-[8px] font-mono text-slate-500 uppercase">done</span>
                        </div>
                      </div>

                      <div className="bg-slate-800 p-2 border border-slate-700 rounded-xl text-right">
                        <span className="text-[7px] font-mono font-black text-slate-500 block uppercase leading-none">STATUS</span>
                        <span className="text-[9px] font-mono font-black uppercase mt-1 block tracking-wider" style={{ color: rc.rawHex }}>
                          {ctrVal >= 100 ? 'SUCCESS' : ctrVal >= 33 ? 'STEADY' : 'LOGGING'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* TACTILE SPHERICAL CHANT BEAD BUTTON */}
                  <div className="relative mb-6 flex items-center justify-center">
                    
                    {/* Ring chain representations background */}
                    <svg className="absolute w-[270px] h-[270px] opacity-40 animate-spin" style={{ animationDuration: '60s' }} viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="41" fill="none" stroke={rc.rawHex} strokeWidth="1" strokeDasharray="3 4" />
                    </svg>

                    {/* Bead Increment Ripple Effects */}
                    <AnimatePresence>
                      {particles.map(p => (
                        <motion.span
                          key={p.id}
                          initial={{ scale: 1, opacity: 0.9 }}
                          animate={{ scale: 4.5, opacity: 0, x: (p.x * 0.5), y: (p.y * 0.5) }}
                          exit={{ opacity: 0 }}
                          className="absolute w-4 h-4 rounded-full pointer-events-none"
                          style={{ backgroundColor: p.color }}
                        />
                      ))}
                    </AnimatePresence>

                    {/* Pulse Rings */}
                    <div className="absolute w-52 h-52 bg-white rounded-full border border-slate-100 shadow-inner flex items-center justify-center">
                      <div className="w-44 h-44 rounded-full bg-slate-50 border border-slate-100 shadow flex flex-col justify-center items-center">
                        <span className="text-3xl font-black text-slate-800 leading-none">{ctrVal}</span>
                        <span className="text-4xs uppercase tracking-[3px] font-extrabold text-slate-400 mt-1.5">Repeats</span>
                      </div>
                    </div>

                    <button
                      onClick={triggerBeadPulse}
                      className="relative w-56 h-56 rounded-full border-8 border-white shadow-2xl flex flex-col items-center justify-center focus:outline-none active:scale-[0.93] active:brightness-95 hover:brightness-105 transition-all select-none cursor-pointer group"
                      style={{
                        background: `radial-gradient(circle, #FAF9F6 0%, ${rc.rawHex} 65%, ${rc.darkHex} 100%)`,
                        boxShadow: `0 16px 40px ${rc.rawHex}50, inset 0 -12px 20px rgba(0,0,0,0.3)`
                      }}
                    >
                      <Sparkles className="w-7 h-7 text-white opacity-80 group-hover:scale-110 transition-transform" />
                      <span className="text-[8px] uppercase tracking-[3px] font-black text-white mt-2">TAP KEY</span>
                      <span className="text-[10px] font-black text-amber-200 mt-1 bg-black/40 px-3 py-0.5 rounded-full">+1 REPEAT</span>
                    </button>
                  </div>

                  {/* Operational physical Buttons */}
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => setCtrVal(0)}
                      className="py-3.5 bg-slate-50 hover:bg-slate-100 text-slate-600 font-extrabold text-3xs uppercase tracking-widest rounded-2xl border border-slate-250 flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-[0.97]"
                    >
                      <RotateCcw className="w-4 h-4" /> Reset Count
                    </button>
                    <button
                      onClick={saveChantSession}
                      className="py-3.5 text-white font-extrabold text-3xs uppercase tracking-widest rounded-2xl shadow-lg border flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-[0.97]"
                      style={{
                        backgroundColor: rc.rawHex,
                        borderColor: rc.darkHex
                      }}
                    >
                      <Save className="w-4 h-4" /> Save Count
                    </button>
                  </div>
                </div>

                {/* Recent Remembrance sessions */}
                <div className="bg-white border border-slate-150 rounded-3xl p-5 shadow-xs text-left">
                  <h4 className="text-3xs font-extrabold text-slate-400 uppercase tracking-widest mb-3.5 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> Recent Sessions
                  </h4>

                  {sessionsHistory.length === 0 ? (
                    <p className="text-3xs font-bold text-slate-400 uppercase tracking-wider py-4 italic text-center">Save counts to start journey log.</p>
                  ) : (
                    <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                      {sessionsHistory.slice(0, 10).map((sh, idx) => (
                        <div key={idx} className="flex justify-between items-center text-sm border-b border-slate-100 pb-2.5 last:border-0 last:pb-0">
                          <div>
                            <span className="font-extrabold text-slate-700 text-xs block leading-tight">{sh.word}</span>
                            <span className="text-5xs text-slate-400 font-black uppercase tracking-wider block mt-0.5">{sh.time}</span>
                          </div>
                          <span className="bg-[#FFF9E6] text-amber-850 text-xs font-black px-3.5 py-1 rounded-full border border-orange-200/40">
                            ×{sh.count}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* TAB 3: INSIGHTS & THE GROWING FAITH GRAPH */}
            {activeTab === 'insights' && (
              <motion.div 
                initial={{ opacity: 0, y: 12 }} 
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col gap-4 text-left"
              >
                {/* Visual growing graph of wellness index (collapsible toggle state) */}
                {showInsightsGraph && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="overflow-hidden"
                  >
                    <FaithGraph 
                      scores={weeklyHistoryScores}
                      currentScore={currentFaithScore}
                      themeHex={rc.rawHex}
                      faithLabel={rc.faithLabel}
                    />
                  </motion.div>
                )}

                {/* Bento grid layout stats */}
                <div className="grid grid-cols-2 gap-3.5">
                  <div className="bg-white border border-slate-150 rounded-3xl p-5 shadow-xs text-center relative overflow-hidden">
                    <span className="text-3xl select-none">✅</span>
                    <span className="text-4xs text-slate-400 tracking-wider uppercase font-black block mt-2">Schedules Done</span>
                    <span className="text-2xl font-black text-slate-800 mt-0.5 block">{countTodayPrayed}</span>
                  </div>

                  <div className="bg-white border border-slate-150 rounded-3xl p-5 shadow-xs text-center relative overflow-hidden">
                    <span className="text-3xl select-none">💤</span>
                    <span className="text-4xs text-slate-400 tracking-wider uppercase font-black block mt-2">Schedules Skipped</span>
                    <span className="text-2xl font-black text-slate-800 mt-0.5 block">{countTodayMissed}</span>
                  </div>

                  <div className="bg-white border border-slate-150 rounded-3xl p-5 shadow-xs text-center relative overflow-hidden1 font-sans">
                    <span className="text-3xl select-none">📿</span>
                    <span className="text-4xs text-slate-400 tracking-wider uppercase font-black block mt-2">{rc.devTotalLabel}</span>
                    <span className="text-2xl font-black text-amber-700 mt-0.5 block">{devTodayTotal}</span>
                  </div>

                  <button 
                    onClick={() => setShowInsightsGraph(prev => !prev)}
                    className="bg-white border border-slate-150 hover:border-slate-300 rounded-3xl p-5 shadow-xs text-center relative overflow-hidden flex flex-col items-center justify-center cursor-pointer transition-all active:scale-[0.96] group select-none"
                    style={{ outline: "none" }}
                  >
                    <span className="text-3xl select-none group-hover:scale-110 transition-transform">📈</span>
                    <span className="text-4xs text-slate-400 tracking-wider uppercase font-black block mt-2">Pace Level</span>
                    <span className="text-xs font-black tracking-widest mt-1 block uppercase font-mono" style={{ color: rc.rawHex }}>
                      {currentFaithScore >= 75 ? 'Glowing ✨' : currentFaithScore >= 45 ? 'Steady 💫' : 'Need Practice'}
                    </span>
                    <span className="text-[7.5px] font-black uppercase tracking-widest text-slate-450 mt-1.5 px-2 py-0.5 rounded bg-slate-50 border border-slate-100 group-hover:bg-slate-100/80 transition-colors leading-none">
                      {showInsightsGraph ? 'Hide Graph ↑' : 'Show Graph ↓'}
                    </span>
                  </button>
                </div>

                {/* Dynamic Remembrance breakdown */}
                <div className="bg-white border border-slate-150 rounded-3xl p-5 shadow-xs">
                  <h4 className="text-3xs font-extrabold text-slate-400 uppercase tracking-widest block mb-3.5">
                    {rc.breakdownTitle}
                  </h4>
                  {Object.keys(devCounts).length === 0 ? (
                    <p className="text-4xs font-bold text-slate-450 uppercase tracking-wider py-4 italic text-center">No chanted items recorded today.</p>
                  ) : (
                    <div className="space-y-3 rounded-2xl bg-slate-50/50 p-4 border border-slate-150 shadow-inner">
                      {Object.entries(devCounts).map(([w, c]) => (
                        <div key={w} className="flex justify-between items-center text-xs font-bold">
                          <span className="text-slate-650">{w}</span>
                          <span className="font-extrabold" style={{ color: rc.rawHex }}>×{c} iterations</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Live Real-time syncing scorecard (Couple & Group tracks) */}
                {roomCode && (
                  <div className="bg-white border border-slate-150 rounded-3xl p-5 shadow-xs">
                    <h4 className="text-3xs font-extrabold uppercase tracking-widest mb-4" style={{ color: rc.rawHex }}>
                      Real-time Sanctuary Leaderboard
                    </h4>
                    
                    <div className="space-y-3">
                      {roomMembersData.length < 2 && mode === 'couple' && (
                        <div className="bg-amber-50/40 p-4 rounded-2xl border border-dashed border-amber-200/60 text-center mb-2">
                          <p className="text-xs font-bold text-slate-700">Waiting for partner to sync...</p>
                          <p className="text-3xs text-slate-400 mt-1">Share the code <span className="font-mono font-bold text-amber-700">{roomCode}</span> with your partner. Once joined, your progress scores will harmonize here side-by-side!</p>
                          
                          {/* Beautiful couple preview slot */}
                          <div className="mt-4 flex gap-2">
                            <div className="flex-1 p-2 rounded-xl border border-slate-100 bg-white/60 blur-[0.5px]">
                              <p className="text-3xs font-black text-slate-500 uppercase">{member?.name} (You)</p>
                              <p className="text-sm font-black text-slate-800 mt-0.5">{currentFaithScore}%</p>
                            </div>
                            <div className="flex-1 p-2 rounded-xl border border-dashed border-slate-200 bg-slate-100/40 opacity-70">
                              <p className="text-3xs font-black text-slate-400 uppercase">Husband / Wife</p>
                              <p className="text-3xs text-slate-400 mt-1 italic">Not synchronized</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {roomMembersData.map((rm, idx) => (
                        <div 
                          key={rm.id} 
                          className="flex items-center justify-between p-3.5 rounded-2xl border text-sm transition-all"
                          style={{
                            borderColor: rm.id === member?.id ? rc.rawHex : '#e2e8f0',
                            backgroundColor: rm.id === member?.id ? `${rc.rawHex}0a` : '#ffffff',
                            fontWeight: rm.id === member?.id ? 'bold' : 'normal'
                          }}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="text-base select-none">
                              {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '✨'}
                            </span>
                            <span className="text-slate-800 text-xs font-bold">{rm.name} {rm.id === member?.id && "(You)"}</span>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <span className="text-5xs text-slate-400 uppercase font-black tracking-widest bg-slate-100 px-2 py-0.5 rounded">
                              Completed: {rm.prayersDone}
                            </span>
                            <span 
                              className="font-black text-xs px-2.5 py-1 rounded-full border"
                              style={{ 
                                color: rc.rawHex, 
                                backgroundColor: `${rc.rawHex}05`,
                                borderColor: `${rc.rawHex}15`
                              }}
                            >
                              {rm.score}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4.5 p-3.5 bg-slate-50 rounded-2xl border border-slate-150 text-3xs text-slate-400 leading-normal italic text-center">
                      {rc.quote}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* TAB 4: CALENDAR HISTORY */}
            {activeTab === 'calendar' && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.99 }} 
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col gap-4 text-left"
              >
                <div className="bg-white border border-slate-150 rounded-3xl p-5 shadow-xs">
                  <h4 className="text-3xs font-extrabold text-slate-400 uppercase tracking-widest block mb-4">
                    Remembrance Journey logs
                  </h4>

                  {/* Clean 7-day historic progress logs */}
                  <div className="space-y-3">
                    {Array.from({ length: 7 }).map((_, i) => {
                      const d = new Date();
                      d.setDate(d.getDate() - i);
                      const dayName = d.toLocaleDateString('en-US', { weekday: 'long' });
                      const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                      
                      // Pull real score from weeklyHistoryScores
                      // weeklyHistoryScores is arranged [Mon, Tue ... Today] so idx 6 is Today, idx 5 is Yesterday, etc.
                      const scoreIdx = 6 - i;
                      const score = weeklyHistoryScores[scoreIdx] !== undefined ? weeklyHistoryScores[scoreIdx] : 0;
                      
                      // High/Med/Low states
                      const isHigh = score >= 70;
                      const isMed = score >= 30 && score < 70;
                      
                      return (
                        <div 
                          key={i} 
                          className="flex items-center justify-between p-3.5 rounded-2xl border transition-all bg-white"
                          style={{
                            borderColor: i === 0 ? `${rc.rawHex}50` : '#f1f5f9',
                            backgroundColor: i === 0 ? `${rc.rawHex}03` : '#ffffff'
                          }}
                        >
                          <div>
                            <span className="text-xs font-extrabold text-slate-800 block">
                              {i === 0 ? 'Today' : i === 1 ? 'Yesterday' : dayName}
                            </span>
                            <span className="text-5xs text-slate-450 uppercase tracking-wider font-extrabold block mt-0.5">
                              {dateStr}
                            </span>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="text-[10px] uppercase font-black tracking-wider px-2 py-0.5 rounded bg-slate-50 border border-slate-100 text-slate-500">
                              {isHigh ? 'Fully Completed' : isMed ? 'In Progress' : 'Active Choice'}
                            </span>
                            <span 
                              className="text-xs font-black px-3 py-1 rounded-full border shadow-2xs"
                              style={{ 
                                color: score > 0 ? rc.rawHex : '#94a3b8', 
                                borderColor: score > 0 ? `${rc.rawHex}30` : '#e2e8f0',
                                backgroundColor: score > 0 ? `${rc.rawHex}05` : '#f8fafc'
                              }}
                            >
                              {score}%
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-white border border-slate-150 rounded-3xl p-5 shadow-xs">
                  <h4 className="text-3xs font-extrabold text-slate-400 uppercase tracking-widest block mb-2">
                    Spiritual Journey Guidance
                  </h4>
                  <ul className="text-slate-500 text-xs space-y-2 leading-relaxed font-semibold">
                    <li>• Keep your daily logs consecutively to secure beautiful spiritual alignment streaks over the weeks.</li>
                    <li>• If you are joined in "Couple" mode, syncing status will allow you both to monitor synced charts from different devices.</li>
                    <li>• To customize the default lists of daily schedules, visit the Room workspace tab.</li>
                  </ul>
                </div>
              </motion.div>
            )}

            {/* TAB 5: SETTINGS / PROFILE CONFIG */}
            {activeTab === 'settings' && (
              <motion.div 
                initial={{ opacity: 0, y: 12 }} 
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col gap-4 text-left"
              >
                <div className="bg-white border border-slate-150 rounded-3xl p-5 shadow-xs">
                  <h4 className="text-3xs font-extrabold text-[#CD7B0E] uppercase tracking-widest mb-4">
                    Account Profile Metadata
                  </h4>
                  
                  <div className="space-y-3.5 text-sm">
                    <div className="flex justify-between items-center py-2.5 border-b border-slate-100">
                      <span className="text-slate-500 font-medium text-xs">Profile Username:</span>
                      <span className="font-extrabold text-slate-800 text-xs">{member?.name || 'Guest Seeker'}</span>
                    </div>

                    <div className="flex justify-between items-center py-2.5 border-b border-slate-100">
                      <span className="text-slate-500 font-medium text-xs">Sanctuary Track:</span>
                      <span className="font-extrabold text-slate-800 text-xs capitalize">{mode} mode</span>
                    </div>

                    {roomCode && (
                      <div className="flex justify-between items-center py-2.5 border-b border-slate-100">
                        <span className="text-slate-500 font-medium text-xs">Joined Members Count:</span>
                        <span className="font-extrabold text-xs text-slate-800 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-md leading-none">
                          {roomMembersData.length || 1} {(roomMembersData.length || 1) === 1 ? 'member' : 'members'}
                        </span>
                      </div>
                    )}

                    {mode === 'couple' && (
                      <div className="flex justify-between items-center py-2.5 border-b border-slate-100">
                        <span className="text-slate-500 font-medium text-xs">Partner Synced:</span>
                        <span className="font-extrabold text-slate-800 text-xs uppercase">{partner ? partner.name : "Waiting for partner..."}</span>
                      </div>
                    )}

                    <div className="flex justify-between items-center py-2.5">
                      <span className="text-slate-500 font-medium text-xs">Active Spiritual Path:</span>
                      <span className="font-extrabold text-slate-800 text-xs capitalize leading-none flex items-center gap-1">
                        <span>{rc.symbol}</span> {rc.name}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-slate-150 rounded-3xl p-5 shadow-xs text-center">
                  <h4 className="text-3xs font-extrabold text-slate-400 uppercase tracking-widest mb-3 text-left">
                    Database Connections
                  </h4>
                  <p className="text-3xs text-slate-400 leading-relaxed text-left mb-4 font-medium uppercase tracking-wider">
                    Updates are automatically synced when network is online. Offline Local Storage provides robust failovers.
                  </p>

                  <button 
                    onClick={handleSignOut}
                    className="w-full py-3.5 bg-red-50 hover:bg-red-100 border border-red-200/50 text-red-700 text-3xs font-extrabold uppercase tracking-widest rounded-2xl cursor-pointer flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <LogOut className="w-4 h-4" /> Disconnect & Sign Out
                  </button>
                </div>
              </motion.div>
            )}

          </div>

          {/* EXQUISITE ELEVATED NAV FLOATER BAR */}
          <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-slate-100 px-3 py-2 flex justify-between items-center z-40 max-w-md mx-auto shadow-2xl">
            {[
              { id: 'prayers', title: 'Schedule', icon: <BookOpen className="w-4 h-4" /> },
              { id: 'dhikr', title: rc.navLabel, icon: <Heart className="w-4 h-4 animate-pulse" /> },
              { id: 'insights', title: 'Status', icon: <BarChart3 className="w-4 h-4" /> },
              { id: 'calendar', title: 'History', icon: <Calendar className="w-4 h-4" /> },
              { id: 'settings', title: 'Room', icon: <Settings className="w-4 h-4" /> }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id as any)}
                className={`flex-1 flex flex-col items-center gap-1 py-1 px-1 rounded-xl transition-all cursor-pointer focus:outline-none ${
                  activeTab === tab.id ? 
                  'font-bold' : 'text-slate-400 hover:text-slate-600'
                }`}
                style={activeTab === tab.id ? { color: rc.rawHex } : {}}
              >
                <div className={`transition-transform duration-200 ${activeTab === tab.id ? 'scale-110' : ''}`}>
                  {tab.icon}
                </div>
                <span className="text-[9px] uppercase tracking-wider font-extrabold">{tab.id === 'dhikr' ? rc.navLabel : tab.title}</span>
              </button>
            ))}
          </nav>

        </div>
      )}

      {/* ══════════════════════════════════════
          MODAL OVERLAY: ADD CUSTOM LITURGIES
         ══════════════════════════════════════ */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-end justify-center z-50 p-4 animate-fade-in">
          <motion.div 
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            className="w-full max-w-sm bg-white border border-slate-100 rounded-t-3xl p-6 shadow-2xl space-y-4"
          >
            <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto mb-1"></div>
            
            <div className="text-center">
              <h3 className="text-base font-black text-slate-800 font-serif">Add Custom Schedule</h3>
              <p className="text-3xs text-slate-400 mt-1 uppercase tracking-wider">Supplement your daily liturgies with custom spiritual study hours or rituals.</p>
            </div>

            <div className="space-y-4 pt-2">
              <div>
                <label className="block text-4xs text-slate-450 font-black uppercase tracking-wider mb-1">Ritual / Study Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. Gita Shlokas study, Daily Rosary..."
                  value={newPrayerName}
                  onChange={e => setNewPrayerName(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-amber-500 transition-colors font-medium text-slate-750"
                />
              </div>

              <div>
                <label className="block text-4xs text-slate-455 font-black uppercase tracking-wider mb-1">Liturgy Alignment</label>
                <select 
                  value={newPrayerPos}
                  onChange={e => setNewPrayerPos(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-amber-500 transition-colors font-bold text-slate-700"
                >
                  <option value="after_last">Flexible timing schedule</option>
                  <option value="before_first">Morning devotional tracker</option>
                  <option value="noontime">Mid-day anchor hour</option>
                  <option value="nighttime">Night sleep study log</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-3">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="py-3 bg-slate-50 hover:bg-slate-100 text-slate-500 font-bold text-3xs uppercase tracking-widest rounded-xl border border-slate-200 cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddCustomPrayer}
                  className="py-3 bg-slate-900 text-white hover:bg-slate-800 font-bold text-3xs uppercase tracking-widest rounded-xl shadow-lg cursor-pointer transition-colors"
                >
                  Confirm Addition
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

    </div>
  );
}
