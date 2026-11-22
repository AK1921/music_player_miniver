// ==============================================================================
// NEXORA MUSIC PLAYER HUB SCREEN
// Playlists, Library, Now-Playing Trigger, Queue & Reactive Visualizer
// ==============================================================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
  TextInput,
  Modal,
  Alert,
  RefreshControl,
  Platform,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../stores/themeStore';
import { usePlayerStore } from '../../stores/playerStore';
import { useMediaStore } from '../../stores/mediaStore';
import {
  searchYouTubeTracks,
  CURATED_YOUTUBE_CATALOG,
  filterOnlineByCategory,
  getTrendingMusic,
  YouTubeTrack,
} from '../../services/youtubeService';
import {
  pickDocumentFromSystem,
  pickMediaFromLibrary,
  pickMultipleMediaFromLibrary,
  pickMultipleAudioFiles,
} from '../../services/mediaPicker';
import { StorageService } from '../../services/storage';
import { MediaViewerModal } from '../../components/viewers/MediaViewerModal';
import { YouTubePlayerModal } from '../../components/viewers/YouTubePlayerModal';
import { Track, Playlist, MediaFile, MediaFolder } from '../../types';
import { useAnimatedValue } from '../../hooks/useAnimatedValue';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const ONLINE_CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'trending', label: '🔥 Trending' },
  { id: 'pop', label: 'Pop Hits' },
  { id: 'rock', label: 'Rock & Metal' },
  { id: 'chill', label: 'Chill & Lo-Fi' },
  { id: 'indian', label: 'Bollywood & Tollywood' },
  { id: 'workout', label: 'Workout' },
  { id: 'party', label: 'Party' },
  { id: 'lyrics', label: 'Lyrics' },
];

const REAL_YOUTUBE_TRACKS = [
  // --- 1. Global Pop & Trending Hits ---
  {
    id: 'yt-blinding-lights',
    youtubeId: '4NRXx6U8ABQ',
    title: 'Blinding Lights (Official Video)',
    artist: 'The Weeknd',
    duration: 263,
    artwork: 'https://i.ytimg.com/vi/4NRXx6U8ABQ/hqdefault.jpg',
    url: 'https://www.youtube.com/watch?v=4NRXx6U8ABQ',
    type: 'video' as const,
    moods: ['happy', 'party', 'workout', 'drive'],
  },
  {
    id: 'yt-starboy',
    youtubeId: '34Na4j8AVgA',
    title: 'Starboy ft. Daft Punk',
    artist: 'The Weeknd, Daft Punk',
    duration: 230,
    artwork: 'https://i.ytimg.com/vi/34Na4j8AVgA/hqdefault.jpg',
    url: 'https://www.youtube.com/watch?v=34Na4j8AVgA',
    type: 'video' as const,
    moods: ['party', 'workout', 'drive'],
  },
  {
    id: 'yt-shape-of-you',
    youtubeId: 'JGwWNGJdvx8',
    title: 'Shape of You [Lyric Video]',
    artist: 'Ed Sheeran',
    duration: 234,
    artwork: 'https://i.ytimg.com/vi/JGwWNGJdvx8/hqdefault.jpg',
    url: 'https://www.youtube.com/watch?v=JGwWNGJdvx8',
    type: 'lyric' as const,
    moods: ['happy', 'relaxing', 'party'],
  },
  {
    id: 'yt-perfect',
    youtubeId: '2Vv-BfVoq4g',
    title: 'Perfect (Official Video)',
    artist: 'Ed Sheeran',
    duration: 263,
    artwork: 'https://i.ytimg.com/vi/2Vv-BfVoq4g/hqdefault.jpg',
    url: 'https://www.youtube.com/watch?v=2Vv-BfVoq4g',
    type: 'video' as const,
    moods: ['romantic', 'relaxing', 'happy'],
  },
  {
    id: 'yt-levitating',
    youtubeId: 'TUVcZfQe-Kw',
    title: 'Levitating [Animated Lyrics]',
    artist: 'Dua Lipa',
    duration: 203,
    artwork: 'https://i.ytimg.com/vi/TUVcZfQe-Kw/hqdefault.jpg',
    url: 'https://www.youtube.com/watch?v=TUVcZfQe-Kw',
    type: 'lyric' as const,
    moods: ['happy', 'party', 'workout'],
  },
  {
    id: 'yt-dont-start-now',
    youtubeId: 'oygrmJFKYZY',
    title: "Don't Start Now (Official Video)",
    artist: 'Dua Lipa',
    duration: 181,
    artwork: 'https://i.ytimg.com/vi/oygrmJFKYZY/hqdefault.jpg',
    url: 'https://www.youtube.com/watch?v=oygrmJFKYZY',
    type: 'video' as const,
    moods: ['party', 'workout', 'happy'],
  },
  {
    id: 'yt-cruel-summer',
    youtubeId: 'ic8j13piAhQ',
    title: 'Cruel Summer (Official Lyric Video)',
    artist: 'Taylor Swift',
    duration: 178,
    artwork: 'https://i.ytimg.com/vi/ic8j13piAhQ/hqdefault.jpg',
    url: 'https://www.youtube.com/watch?v=ic8j13piAhQ',
    type: 'lyric' as const,
    moods: ['happy', 'party', 'drive'],
  },
  {
    id: 'yt-blank-space',
    youtubeId: 'e-ORhEE9VVg',
    title: 'Blank Space (Official Music Video)',
    artist: 'Taylor Swift',
    duration: 272,
    artwork: 'https://i.ytimg.com/vi/e-ORhEE9VVg/hqdefault.jpg',
    url: 'https://www.youtube.com/watch?v=e-ORhEE9VVg',
    type: 'video' as const,
    moods: ['happy', 'party'],
  },
  {
    id: 'yt-bad-guy',
    youtubeId: 'dyRsYk0LyA8',
    title: 'Bad Guy (Official Music Video)',
    artist: 'Billie Eilish',
    duration: 205,
    artwork: 'https://i.ytimg.com/vi/dyRsYk0LyA8/hqdefault.jpg',
    url: 'https://www.youtube.com/watch?v=dyRsYk0LyA8',
    type: 'video' as const,
    moods: ['party', 'workout', 'drive'],
  },
  {
    id: 'yt-sunflower',
    youtubeId: 'ApXoWvfEYVU',
    title: 'Sunflower (Spider-Man OST)',
    artist: 'Post Malone, Swae Lee',
    duration: 158,
    artwork: 'https://i.ytimg.com/vi/ApXoWvfEYVU/hqdefault.jpg',
    url: 'https://www.youtube.com/watch?v=ApXoWvfEYVU',
    type: 'video' as const,
    moods: ['happy', 'relaxing', 'drive'],
  },
  {
    id: 'yt-circles',
    youtubeId: 'wXhTHyIgQ_U',
    title: 'Circles (Official Music Video)',
    artist: 'Post Malone',
    duration: 215,
    artwork: 'https://i.ytimg.com/vi/wXhTHyIgQ_U/hqdefault.jpg',
    url: 'https://www.youtube.com/watch?v=wXhTHyIgQ_U',
    type: 'video' as const,
    moods: ['relaxing', 'sad', 'drive'],
  },
  {
    id: 'yt-despacito',
    youtubeId: 'kJQP7kiw5Fk',
    title: 'Despacito ft. Daddy Yankee',
    artist: 'Luis Fonsi',
    duration: 282,
    artwork: 'https://i.ytimg.com/vi/kJQP7kiw5Fk/hqdefault.jpg',
    url: 'https://www.youtube.com/watch?v=kJQP7kiw5Fk',
    type: 'video' as const,
    moods: ['party', 'happy', 'workout'],
  },
  {
    id: 'yt-24k-magic',
    youtubeId: 'UqyT8IEBkvY',
    title: '24K Magic (Official Music Video)',
    artist: 'Bruno Mars',
    duration: 226,
    artwork: 'https://i.ytimg.com/vi/UqyT8IEBkvY/hqdefault.jpg',
    url: 'https://www.youtube.com/watch?v=UqyT8IEBkvY',
    type: 'video' as const,
    moods: ['party', 'happy'],
  },
  {
    id: 'yt-attention',
    youtubeId: 'nfs8NYg7yQM',
    title: 'Attention (Official Music Video)',
    artist: 'Charlie Puth',
    duration: 211,
    artwork: 'https://i.ytimg.com/vi/nfs8NYg7yQM/hqdefault.jpg',
    url: 'https://www.youtube.com/watch?v=nfs8NYg7yQM',
    type: 'video' as const,
    moods: ['workout', 'drive', 'party'],
  },
  // --- 2. EDM, Electro & Festival Bangers ---
  {
    id: 'yt-faded',
    youtubeId: '60ItHLz5WEA',
    title: 'Faded (Official Music Video)',
    artist: 'Alan Walker',
    duration: 212,
    artwork: 'https://i.ytimg.com/vi/60ItHLz5WEA/hqdefault.jpg',
    url: 'https://www.youtube.com/watch?v=60ItHLz5WEA',
    type: 'video' as const,
    moods: ['sad', 'relaxing', 'focus'],
  },
  {
    id: 'yt-alone',
    youtubeId: 'ALZHF5UqnU4',
    title: 'Alone (Official Music Video)',
    artist: 'Marshmello',
    duration: 199,
    artwork: 'https://i.ytimg.com/vi/ALZHF5UqnU4/hqdefault.jpg',
    url: 'https://www.youtube.com/watch?v=ALZHF5UqnU4',
    type: 'video' as const,
    moods: ['workout', 'party', 'happy'],
  },
  {
    id: 'yt-closer',
    youtubeId: 'PT2_F-1esPk',
    title: 'Closer ft. Halsey [Lyric Video]',
    artist: 'The Chainsmokers',
    duration: 245,
    artwork: 'https://i.ytimg.com/vi/PT2_F-1esPk/hqdefault.jpg',
    url: 'https://www.youtube.com/watch?v=PT2_F-1esPk',
    type: 'lyric' as const,
    moods: ['party', 'happy', 'drive'],
  },
  {
    id: 'yt-wake-me-up',
    youtubeId: 'IcrbM1l_BoI',
    title: 'Wake Me Up (Official Music Video)',
    artist: 'Avicii',
    duration: 272,
    artwork: 'https://i.ytimg.com/vi/IcrbM1l_BoI/hqdefault.jpg',
    url: 'https://www.youtube.com/watch?v=IcrbM1l_BoI',
    type: 'video' as const,
    moods: ['happy', 'party', 'workout'],
  },
  // --- 3. Rock, Anthems & Legends ---
  {
    id: 'yt-believer',
    youtubeId: '7wtfhZwyrcc',
    title: 'Believer (Official Music Video)',
    artist: 'Imagine Dragons',
    duration: 216,
    artwork: 'https://i.ytimg.com/vi/7wtfhZwyrcc/hqdefault.jpg',
    url: 'https://www.youtube.com/watch?v=7wtfhZwyrcc',
    type: 'video' as const,
    moods: ['workout', 'party', 'rock'],
  },
  {
    id: 'yt-bohemian',
    youtubeId: 'fJ9rUzIMcZQ',
    title: 'Bohemian Rhapsody (Official Remaster)',
    artist: 'Queen',
    duration: 360,
    artwork: 'https://i.ytimg.com/vi/fJ9rUzIMcZQ/hqdefault.jpg',
    url: 'https://www.youtube.com/watch?v=fJ9rUzIMcZQ',
    type: 'video' as const,
    moods: ['rock', 'sad', 'focus'],
  },
  {
    id: 'yt-in-the-end',
    youtubeId: 'eVTXPUF4Oz4',
    title: 'In The End (Official HD Video)',
    artist: 'Linkin Park',
    duration: 218,
    artwork: 'https://i.ytimg.com/vi/eVTXPUF4Oz4/hqdefault.jpg',
    url: 'https://www.youtube.com/watch?v=eVTXPUF4Oz4',
    type: 'video' as const,
    moods: ['rock', 'workout', 'sad'],
  },
  {
    id: 'yt-viva-la-vida',
    youtubeId: 'dvgZkm1xWPE',
    title: 'Viva La Vida (Official Video)',
    artist: 'Coldplay',
    duration: 242,
    artwork: 'https://i.ytimg.com/vi/dvgZkm1xWPE/hqdefault.jpg',
    url: 'https://www.youtube.com/watch?v=dvgZkm1xWPE',
    type: 'video' as const,
    moods: ['happy', 'rock', 'focus'],
  },
  // --- 4. Bollywood, Indian Pop & Melodies ---
  {
    id: 'yt-kesariya',
    youtubeId: 'BddP6PYo2gs',
    title: 'Kesariya (Brahmastra Official)',
    artist: 'Arijit Singh, Pritam',
    duration: 268,
    artwork: 'https://i.ytimg.com/vi/BddP6PYo2gs/hqdefault.jpg',
    url: 'https://www.youtube.com/watch?v=BddP6PYo2gs',
    type: 'video' as const,
    moods: ['romantic', 'happy', 'relaxing'],
  },
  {
    id: 'yt-tum-hi-ho',
    youtubeId: 'IJq0ydzFlNE',
    title: 'Tum Hi Ho (Aashiqui 2 Video)',
    artist: 'Arijit Singh, Mithoon',
    duration: 262,
    artwork: 'https://i.ytimg.com/vi/IJq0ydzFlNE/hqdefault.jpg',
    url: 'https://www.youtube.com/watch?v=IJq0ydzFlNE',
    type: 'video' as const,
    moods: ['sad', 'romantic', 'relaxing'],
  },
  {
    id: 'yt-channa-mereya',
    youtubeId: 'bzSTpdcs-EI',
    title: 'Channa Mereya (Official Lyric Video)',
    artist: 'Arijit Singh, Pritam',
    duration: 289,
    artwork: 'https://i.ytimg.com/vi/bzSTpdcs-EI/hqdefault.jpg',
    url: 'https://www.youtube.com/watch?v=bzSTpdcs-EI',
    type: 'lyric' as const,
    moods: ['sad', 'melancholy', 'romantic'],
  },
  {
    id: 'yt-apna-bana-le',
    youtubeId: 'ElZfdU54Cp8',
    title: 'Apna Bana Le (Bhediya OST)',
    artist: 'Arijit Singh, Sachin-Jigar',
    duration: 261,
    artwork: 'https://i.ytimg.com/vi/ElZfdU54Cp8/hqdefault.jpg',
    url: 'https://www.youtube.com/watch?v=ElZfdU54Cp8',
    type: 'video' as const,
    moods: ['romantic', 'relaxing'],
  },
  {
    id: 'yt-chaleya',
    youtubeId: 'VAdGW7QDJUI',
    title: 'Chaleya (Jawan)',
    artist: 'Arijit Singh, Shilpa Rao, Anirudh',
    duration: 200,
    artwork: 'https://i.ytimg.com/vi/VAdGW7QDJUI/hqdefault.jpg',
    url: 'https://www.youtube.com/watch?v=VAdGW7QDJUI',
    type: 'video' as const,
    moods: ['happy', 'party', 'romantic'],
  },
  {
    id: 'yt-raataan-lambiyan',
    youtubeId: 'gvyUuxdRdR4',
    title: 'Raataan Lambiyan (Shershaah)',
    artist: 'Jubin Nautiyal, Asees Kaur',
    duration: 230,
    artwork: 'https://i.ytimg.com/vi/gvyUuxdRdR4/hqdefault.jpg',
    url: 'https://www.youtube.com/watch?v=gvyUuxdRdR4',
    type: 'lyric' as const,
    moods: ['romantic', 'relaxing', 'happy'],
  },
  {
    id: 'yt-srivalli',
    youtubeId: 'hcMzwMrr1tE',
    title: 'Srivalli (Pushpa: The Rise)',
    artist: 'Sid Sriram, Devi Sri Prasad',
    duration: 224,
    artwork: 'https://i.ytimg.com/vi/hcMzwMrr1tE/hqdefault.jpg',
    url: 'https://www.youtube.com/watch?v=hcMzwMrr1tE',
    type: 'video' as const,
    moods: ['happy', 'party'],
  },
  {
    id: 'yt-kun-faya-kun',
    youtubeId: 'T94PHkuydcw',
    title: 'Kun Faya Kun (Rockstar Sufi Hymn)',
    artist: 'A.R. Rahman, Javed Ali, Mohit Chauhan',
    duration: 472,
    artwork: 'https://i.ytimg.com/vi/T94PHkuydcw/hqdefault.jpg',
    url: 'https://www.youtube.com/watch?v=T94PHkuydcw',
    type: 'video' as const,
    moods: ['devotional', 'peace', 'relaxing'],
  },
  // --- 5. Devotional, Spiritual & Chants ---
  {
    id: 'yt-gayatri',
    youtubeId: 'S1qhzxwrVlQ',
    title: 'Gayatri Mantra Sacred Chants',
    artist: 'Anuradha Paudwal, T-Series',
    duration: 320,
    artwork: 'https://i.ytimg.com/vi/S1qhzxwrVlQ/hqdefault.jpg',
    url: 'https://www.youtube.com/watch?v=S1qhzxwrVlQ',
    type: 'lyric' as const,
    moods: ['devotional', 'relaxing', 'focus'],
  },
  {
    id: 'yt-hanuman',
    youtubeId: 'AETFv498628',
    title: 'Shri Hanuman Chalisa Divine',
    artist: 'Hariharan, Gulshan Kumar',
    duration: 580,
    artwork: 'https://i.ytimg.com/vi/AETFv498628/hqdefault.jpg',
    url: 'https://www.youtube.com/watch?v=AETFv498628',
    type: 'video' as const,
    moods: ['devotional', 'workout', 'peace'],
  },
  {
    id: 'yt-shiv-tandav',
    youtubeId: 'z67f4Msk7xM',
    title: 'Shiv Tandav Stotram (Powerful Chants)',
    artist: 'Shankar Mahadevan',
    duration: 554,
    artwork: 'https://i.ytimg.com/vi/z67f4Msk7xM/hqdefault.jpg',
    url: 'https://www.youtube.com/watch?v=z67f4Msk7xM',
    type: 'video' as const,
    moods: ['devotional', 'workout'],
  },
  {
    id: 'yt-shri-ram-chandra',
    youtubeId: 'd1tZgDq21kY',
    title: 'Shri Ram Chandra Kripalu Bhajman',
    artist: 'Jubin Nautiyal',
    duration: 332,
    artwork: 'https://i.ytimg.com/vi/d1tZgDq21kY/hqdefault.jpg',
    url: 'https://www.youtube.com/watch?v=d1tZgDq21kY',
    type: 'lyric' as const,
    moods: ['devotional', 'peace'],
  },
  // --- 6. Lo-Fi, Ambient & Study Beats ---
  {
    id: 'yt-lofi-girl',
    youtubeId: '5qap5aO4i9A',
    title: 'Lofi Hip Hop – Beats to Relax / Study',
    artist: 'Lofi Girl Records',
    duration: 1800,
    artwork: 'https://i.ytimg.com/vi/5qap5aO4i9A/hqdefault.jpg',
    url: 'https://www.youtube.com/watch?v=5qap5aO4i9A',
    type: 'video' as const,
    moods: ['relaxing', 'focus', 'sleep'],
  },
  {
    id: 'yt-chillhop-coffee',
    youtubeId: '-5KAN9_CzSA',
    title: 'Coffee Shop Lo-Fi Beats to Relax/Study to',
    artist: 'Chillhop Music',
    duration: 1620,
    artwork: 'https://i.ytimg.com/vi/-5KAN9_CzSA/hqdefault.jpg',
    url: 'https://www.youtube.com/watch?v=-5KAN9_CzSA',
    type: 'video' as const,
    moods: ['relaxing', 'focus', 'sleep'],
  },
  {
    id: 'yt-kupla',
    youtubeId: 'fE2h3lGlOsk',
    title: 'Kingdom in Blue (Lo-Fi Album)',
    artist: 'Kupla, ChilledCow',
    duration: 1450,
    artwork: 'https://i.ytimg.com/vi/fE2h3lGlOsk/hqdefault.jpg',
    url: 'https://www.youtube.com/watch?v=fE2h3lGlOsk',
    type: 'video' as const,
    moods: ['relaxing', 'focus'],
  },
  // --- 7. Workout, Gym & High Energy ---
  {
    id: 'yt-lose-yourself',
    youtubeId: '_Yhyp-_hX2s',
    title: 'Lose Yourself (Official 4K Remaster)',
    artist: 'Eminem',
    duration: 326,
    artwork: 'https://i.ytimg.com/vi/_Yhyp-_hX2s/hqdefault.jpg',
    url: 'https://www.youtube.com/watch?v=_Yhyp-_hX2s',
    type: 'video' as const,
    moods: ['workout', 'party'],
  },
  {
    id: 'yt-fight-back',
    youtubeId: 'R-1XbQ8Ff18',
    title: 'Fight Back (Official Lyric Video)',
    artist: 'NEFFEX',
    duration: 196,
    artwork: 'https://i.ytimg.com/vi/R-1XbQ8Ff18/hqdefault.jpg',
    url: 'https://www.youtube.com/watch?v=R-1XbQ8Ff18',
    type: 'lyric' as const,
    moods: ['workout', 'party'],
  },
  {
    id: 'yt-grateful',
    youtubeId: '83RUhA536yU',
    title: 'Grateful (Workout Motivation Beat)',
    artist: 'NEFFEX',
    duration: 182,
    artwork: 'https://i.ytimg.com/vi/83RUhA536yU/hqdefault.jpg',
    url: 'https://www.youtube.com/watch?v=83RUhA536yU',
    type: 'video' as const,
    moods: ['workout', 'happy'],
  },
];

export default function MusicScreen() {
  const { theme } = useThemeStore();
  const {
    currentTrack,
    isPlaying,
    queue,
    recentlyPlayed,
    playlists,
    visualizerBars,
    playTrack,
    togglePlayPause,
    setExpandedNowPlaying,
    createPlaylist,
    deletePlaylist,
    renamePlaylist,
    updatePlaylistCover,
    addTrackToPlaylist,
    removeTrackFromPlaylist,
    deleteTrack,
    renameTrack,
    updateTrackArtwork,
    clearSampleTracks,
    exportSyncToken,
    importSyncToken,
    setSleepTimer,
    playNext,
    playPrevious,
  } = usePlayerStore();
  const {
    files,
    uploadFile,
    uploadMultipleFiles,
    fetchMedia,
    folders,
    moveFile,
    createFolder,
    renameFile,
    renameFolder,
    deleteFolder,
    setFolderCover,
    softDeleteFiles,
  } = useMediaStore();

  const [ytPlayerVisible, setYtPlayerVisible] = useState(false);
  const [selectedYtTrack, setSelectedYtTrack] = useState<any>(null);

  const handlePlayYouTubeTrack = (track: any) => {
    setSelectedYtTrack(track);
    setYtPlayerVisible(true);
  };

  const [activeTab, setActiveTab] = useState<'online' | 'tracks' | 'videos' | 'playlists' | 'recent'>('online');
  const [onlineTracks, setOnlineTracks] = useState<YouTubeTrack[]>(CURATED_YOUTUBE_CATALOG);
  const [isOnlineLoading, setIsOnlineLoading] = useState(false);
  const [onlineSelectedCategory, setOnlineSelectedCategory] = useState('all');
  const [featuresOpen, setFeaturesOpen] = useState(false);

  const handleCategorySelect = (catId: string) => {
    setOnlineSelectedCategory(catId);
    setOnlineSearchText('');
    if (catId === 'all') {
      setOnlineTracks(CURATED_YOUTUBE_CATALOG);
    } else {
      setOnlineTracks(filterOnlineByCategory(catId));
    }
  };

  const handleSearchOnline = async (queryText?: string) => {
    const q = (queryText !== undefined ? queryText : onlineSearchText).trim();
    if (!q) {
      setOnlineTracks(CURATED_YOUTUBE_CATALOG);
      return;
    }
    setIsOnlineLoading(true);
    try {
      const results = await searchYouTubeTracks(q);
      setOnlineTracks(results);
    } catch (err) {
      console.warn('Online search error:', err);
    } finally {
      setIsOnlineLoading(false);
    }
  };

  const handleClearOnlineSearch = () => {
    setOnlineSearchText('');
    setOnlineSelectedCategory('all');
    setOnlineTracks(CURATED_YOUTUBE_CATALOG);
  };

  const handleAddOnlineTrackToPlaylist = (track: YouTubeTrack) => {
    setTargetTrackForPlaylist({
      id: track.id,
      title: track.title,
      artist: track.artist,
      artwork: track.artwork,
      url: track.url,
      duration: track.duration || 210,
    } as any);
    setPlaylistModalVisible(true);
  };

  // Subtle fade-in each time the content tab changes
  const tabFade = useAnimatedValue(1);
  useEffect(() => {
    tabFade.setValue(0);
    Animated.timing(tabFade, { toValue: 1, duration: 220, useNativeDriver: false }).start();
  }, [activeTab]);
  const [onlineSearchText, setOnlineSearchText] = useState('');
  const [onlineFilterType, setOnlineFilterType] = useState<'all' | 'video' | 'lyric'>('all');
  const [onlineViewMode, setOnlineViewMode] = useState<'grid' | 'list'>('grid');
  const [viewerFile, setViewerFile] = useState<MediaFile | null>(null);
  const [playlistModalVisible, setPlaylistModalVisible] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Feature 1 & 10: AI Assistant & Moods
  const [aiAssistantModalVisible, setAiAssistantModalVisible] = useState(false);
  const [selectedMood, setSelectedMood] = useState('All');
  const [aiPromptText, setAiPromptText] = useState('');

  // Feature 3: Cross-Device Sync
  const [syncModalVisible, setSyncModalVisible] = useState(false);
  const [syncExportToken, setSyncExportToken] = useState('');
  const [syncImportToken, setSyncImportToken] = useState('');

  // Feature 7: Voice Commands
  const [voiceModalVisible, setVoiceModalVisible] = useState(false);
  const [voiceListening, setVoiceListening] = useState(false);
  const [voiceStatusText, setVoiceStatusText] = useState('Tap a command or say something...');
  const [voiceInputManual, setVoiceInputManual] = useState('');

  // Feature 1: YouTube Music Search
  const [ytSearchResults, setYtSearchResults] = useState<YouTubeTrack[]>([]);
  const [ytSearchQuery, setYtSearchQuery] = useState('');
  const [ytSearchLoading, setYtSearchLoading] = useState(false);
  const [ytHasSearched, setYtHasSearched] = useState(false);

  // Feature 10: AI Playlist Generator
  const [aiPlaylistModalVisible, setAiPlaylistModalVisible] = useState(false);
  const [aiPlaylistMood, setAiPlaylistMood] = useState('Energetic');
  const [aiPlaylistActivity, setAiPlaylistActivity] = useState('Workout');
  const [aiPlaylistTrackCount, setAiPlaylistTrackCount] = useState(5);
  const [aiPlaylistTitle, setAiPlaylistTitle] = useState('');

  // Rename Playlist Modal State
  const [renamePlaylistModalVisible, setRenamePlaylistModalVisible] = useState(false);
  const [playlistToRename, setPlaylistToRename] = useState<Playlist | null>(null);
  const [newPlaylistRenameName, setNewPlaylistRenameName] = useState('');

  // Rename Folder Modal State
  const [renameFolderModalVisible, setRenameFolderModalVisible] = useState(false);
  const [folderToRename, setFolderToRename] = useState<MediaFolder | null>(null);
  const [newFolderRenameName, setNewFolderRenameName] = useState('');

  // Rename Track Modal State
  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [targetTrackForRename, setTargetTrackForRename] = useState<Track | null>(null);
  const [newTrackTitle, setNewTrackTitle] = useState('');
  const [newTrackArtist, setNewTrackArtist] = useState('');

  // Track 3-Dots Action Sheet State
  const [trackActionsModalVisible, setTrackActionsModalVisible] = useState(false);
  const [selectedTrackForActions, setSelectedTrackForActions] = useState<Track | null>(null);

  // Video 3-Dots Action Sheet & Manage State
  const [videoActionsModalVisible, setVideoActionsModalVisible] = useState(false);
  const [selectedVideoForActions, setSelectedVideoForActions] = useState<MediaFile | null>(null);
  const [renameVideoModalVisible, setRenameVideoModalVisible] = useState(false);
  const [newVideoName, setNewVideoName] = useState('');
  const [moveVideoToFolderModalVisible, setMoveVideoToFolderModalVisible] = useState(false);

  // Playlist Details & Organization State
  const [selectedPlaylistForView, setSelectedPlaylistForView] = useState<Playlist | null>(null);
  const [addToPlaylistModalVisible, setAddToPlaylistModalVisible] = useState(false);
  const [targetTrackForPlaylist, setTargetTrackForPlaylist] = useState<Track | null>(null);
  const [moveTrackToFolderModalVisible, setMoveTrackToFolderModalVisible] = useState(false);
  const [targetTrackForFolder, setTargetTrackForFolder] = useState<Track | null>(null);
  const [addSongsToPlaylistModalVisible, setAddSongsToPlaylistModalVisible] = useState(false);
  const [newFolderModalVisible, setNewFolderModalVisible] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchMedia();
    setRefreshing(false);
  };

  // Extract all audio files from media store
  const audioFilesAsTracks: Track[] = files
    .filter(f => f.fileType === 'audio' && !f.isDeleted)
    .map(f => ({
      id: f.id,
      url: f.uri || f.storagePath,
      title: f.title || f.name.replace(/\.[^/.]+$/, ''),
      artist: f.artist || 'Uploaded Audio',
      album: f.album || 'AK Audio',
      artwork: f.thumbnailPath || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400',
      duration: f.durationSeconds || undefined,
    }));

  // Extract all video files from media store
  const videoFiles = files.filter(f => f.fileType === 'video' && !f.isDeleted);

  // Identify demo tracks (tracks in queue that are NOT from uploaded files)
  const demoTrackIds = new Set(['track-1', 'track-2', 'track-3']);
  const uploadedQueueTracks = queue.filter(t => !demoTrackIds.has(t.id));
  const demoQueueTracks = queue.filter(t => demoTrackIds.has(t.id));

  // If user has uploaded audio files, show only those. Otherwise show demo queue.
  const allTracks = audioFilesAsTracks.length > 0
    ? audioFilesAsTracks
    : demoQueueTracks.length > 0 ? demoQueueTracks : uploadedQueueTracks;

  // Show CLEAR DEMO TRACKS button only when demo tracks exist and user has no uploads
  const hasDemoTracks = demoQueueTracks.length > 0 && audioFilesAsTracks.length === 0;

  const handleCreatePlaylist = () => {
    if (newPlaylistName.trim()) {
      createPlaylist(newPlaylistName.trim());
      setNewPlaylistName('');
      setPlaylistModalVisible(false);
    }
  };

  const handlePickArtworkForTrack = async (track: Track) => {
    try {
      const img = await pickMediaFromLibrary('images');
      if (img?.uri) {
        await updateTrackArtwork(track.id, img.uri);
        Alert.alert('Artwork Updated', `New cover image applied to "${track.title}".`);
      }
    } catch (e: any) {
      Alert.alert('Cover Error', e?.message || 'Could not select image');
    }
  };

  const handleUploadAudio = async () => {
    Alert.alert('Upload Music', 'Choose upload option:', [
      {
        text: '🎵 Bulk Upload Songs (Select Multiple)',
        onPress: async () => {
          try {
            const picked = await pickMultipleAudioFiles();
            if (picked && picked.length > 0) {
              const count = await uploadMultipleFiles(picked);
              Alert.alert('Bulk Upload Complete', `Successfully added ${count} songs to your library.`);
            }
          } catch (e: any) {
            Alert.alert('Upload Error', e?.message || 'Failed to bulk upload audio');
          }
        },
      },
      {
        text: '🖼️ Single Song (With Custom Artwork)',
        onPress: async () => {
          try {
            const picked = await pickDocumentFromSystem();
            if (picked) {
              Alert.alert(
                'Song Cover Image',
                `Would you like to choose a custom cover artwork image for "${picked.name}"?`,
                [
                  {
                    text: 'Default Cover',
                    style: 'cancel',
                    onPress: async () => {
                      await uploadFile(picked);
                      Alert.alert('Success', `"${picked.name}" added to your library.`);
                    },
                  },
                  {
                    text: 'Choose Artwork',
                    onPress: async () => {
                      try {
                        const cover = await pickMediaFromLibrary('images');
                        let persistentCoverUri = cover?.uri;
                        if (cover?.uri) {
                          try {
                            persistentCoverUri = await StorageService.persistLocalFile(
                              cover.uri,
                              `cover_${picked.name}`
                            );
                          } catch (e) {}
                        }
                        await uploadFile({
                          ...picked,
                          thumbnailPath: persistentCoverUri,
                        });
                        Alert.alert('Success', `"${picked.name}" added with permanent custom cover!`);
                      } catch {
                        await uploadFile(picked);
                      }
                    },
                  },
                ]
              );
            }
          } catch (e: any) {
            Alert.alert('Upload Error', e?.message || 'Failed to select audio');
          }
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleUploadVideos = async () => {
    Alert.alert('Upload Videos', 'Select videos from gallery:', [
      {
        text: '🎬 Bulk Upload Videos (Select Multiple)',
        onPress: async () => {
          try {
            const picked = await pickMultipleMediaFromLibrary('videos');
            if (picked && picked.length > 0) {
              const count = await uploadMultipleFiles(picked);
              Alert.alert('Upload Complete', `Successfully added ${count} ${count === 1 ? 'video' : 'videos'} to your library.`);
            }
          } catch (e: any) {
            Alert.alert('Video Error', e?.message || 'Could not upload videos');
          }
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleChangePlaylistCover = async (pl: Playlist) => {
    try {
      const image = await pickMediaFromLibrary('images');
      if (image?.uri) {
        await updatePlaylistCover(pl.id, image.uri);
        Alert.alert('Cover Updated', `Cover image for "${pl.name}" updated successfully.`);
      }
    } catch (e: any) {
      Alert.alert('Cover Error', e?.message || 'Failed to select playlist cover');
    }
  };

  const openRenamePlaylistModal = (pl: Playlist) => {
    setPlaylistToRename(pl);
    setNewPlaylistRenameName(pl.name);
    setRenamePlaylistModalVisible(true);
  };

  const handleSavePlaylistRename = () => {
    if (playlistToRename && newPlaylistRenameName.trim()) {
      renamePlaylist(playlistToRename.id, newPlaylistRenameName.trim());
      setRenamePlaylistModalVisible(false);
      setPlaylistToRename(null);
      Alert.alert('Playlist Renamed', `Renamed to "${newPlaylistRenameName.trim()}".`);
    }
  };

  const handleChangeFolderCover = async (folder: MediaFolder) => {
    try {
      const image = await pickMediaFromLibrary('images');
      if (image?.uri) {
        await setFolderCover(folder.id, image.uri);
        Alert.alert('Folder Cover Updated', `Cover image for "${folder.name}" updated successfully.`);
      }
    } catch (e: any) {
      Alert.alert('Cover Error', e?.message || 'Failed to select folder cover');
    }
  };

  const openRenameFolderModal = (folder: MediaFolder) => {
    setFolderToRename(folder);
    setNewFolderRenameName(folder.name);
    setRenameFolderModalVisible(true);
  };

  const handleSaveRenameFolder = async () => {
    if (folderToRename && newFolderRenameName.trim()) {
      await renameFolder(folderToRename.id, newFolderRenameName.trim());
      setRenameFolderModalVisible(false);
      setFolderToRename(null);
      Alert.alert('Folder Renamed', `Renamed to "${newFolderRenameName.trim()}".`);
    }
  };

  const handleDeleteFolderWithConfirm = (folder: MediaFolder) => {
    Alert.alert('Delete Folder', `Delete "${folder.name}"? Media files inside will be preserved in main library.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteFolder(folder.id);
          Alert.alert('Folder Deleted', `"${folder.name}" has been deleted.`);
        },
      },
    ]);
  };

  const openTrackActionsModal = (track: Track) => {
    setSelectedTrackForActions(track);
    setTrackActionsModalVisible(true);
  };

  const openRenameModal = (track: Track) => {
    setTargetTrackForRename(track);
    setNewTrackTitle(track.title);
    setNewTrackArtist(track.artist || '');
    setRenameModalVisible(true);
  };

  const handleSaveRename = async () => {
    if (targetTrackForRename && newTrackTitle.trim()) {
      await renameTrack(targetTrackForRename.id, newTrackTitle.trim(), newTrackArtist.trim());
      Alert.alert('Song Updated', `"${newTrackTitle.trim()}" details have been saved.`);
      setRenameModalVisible(false);
      setTargetTrackForRename(null);
    }
  };

  const handleDeleteTrackWithConfirm = (track: Track) => {
    Alert.alert(
      'Delete Song',
      `Are you sure you want to delete "${track.title}" from your library?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteTrack(track.id);
            Alert.alert('Song Deleted', `"${track.title}" has been deleted.`);
          },
        },
      ]
    );
  };

  const openAddToPlaylistModal = (track: Track) => {
    setTargetTrackForPlaylist(track);
    setAddToPlaylistModalVisible(true);
  };

  const handleAddTrackToSpecificPlaylist = async (playlistId: string) => {
    if (targetTrackForPlaylist) {
      await addTrackToPlaylist(playlistId, targetTrackForPlaylist.id);
      const targetPl = playlists.find(p => p.id === playlistId);
      Alert.alert('Added to Playlist', `"${targetTrackForPlaylist.title}" added to "${targetPl?.name || 'Playlist'}".`);
      setAddToPlaylistModalVisible(false);
      setTargetTrackForPlaylist(null);
    }
  };

  const openMoveTrackToFolderModal = (track: Track) => {
    setTargetTrackForFolder(track);
    setMoveTrackToFolderModalVisible(true);
  };

  const handleMoveTrackToFolder = async (folderId: string | null) => {
    if (targetTrackForFolder) {
      await moveFile(targetTrackForFolder.id, folderId);
      const targetFolder = folders.find(f => f.id === folderId);
      Alert.alert(
        'Moved to Folder',
        `"${targetTrackForFolder.title}" moved to ${targetFolder ? `"${targetFolder.name}"` : 'Root Library'}.`
      );
      setMoveTrackToFolderModalVisible(false);
      setTargetTrackForFolder(null);
    }
  };

  const openVideoActionsModal = (video: MediaFile) => {
    setSelectedVideoForActions(video);
    setVideoActionsModalVisible(true);
  };

  const openRenameVideoModal = (video: MediaFile) => {
    setSelectedVideoForActions(video);
    setNewVideoName(video.name.replace(/\.[^/.]+$/, ''));
    setRenameVideoModalVisible(true);
  };

  const handleSaveVideoRename = async () => {
    if (selectedVideoForActions && newVideoName.trim()) {
      const ext = selectedVideoForActions.name.includes('.')
        ? '.' + selectedVideoForActions.name.split('.').pop()
        : '';
      const finalName = newVideoName.trim().endsWith(ext)
        ? newVideoName.trim()
        : `${newVideoName.trim()}${ext}`;

      await renameFile(selectedVideoForActions.id, finalName);
      setRenameVideoModalVisible(false);
      setSelectedVideoForActions(null);
      Alert.alert('Video Renamed', `Video renamed to "${finalName}".`);
    }
  };

  const openMoveVideoToFolderModal = (video: MediaFile) => {
    setSelectedVideoForActions(video);
    setMoveVideoToFolderModalVisible(true);
  };

  const handleMoveVideoToFolder = async (folderId: string | null) => {
    if (selectedVideoForActions) {
      await moveFile(selectedVideoForActions.id, folderId);
      const targetFolder = folders.find(f => f.id === folderId);
      Alert.alert(
        'Moved to Folder',
        `"${selectedVideoForActions.name}" moved to ${targetFolder ? `"${targetFolder.name}"` : 'Root Library'}.`
      );
      setMoveVideoToFolderModalVisible(false);
      setSelectedVideoForActions(null);
    }
  };

  const handleDeleteVideoWithConfirm = (video: MediaFile) => {
    Alert.alert(
      'Delete Video',
      `Are you sure you want to delete "${video.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await softDeleteFiles([video.id]);
            Alert.alert('Video Deleted', `"${video.name}" has been deleted.`);
          },
        },
      ]
    );
  };

  const handleCreateFolderFromMusic = async () => {
    if (newFolderName.trim()) {
      await createFolder(newFolderName.trim(), '#EC4899', 'musical-notes');
      setNewFolderName('');
      setNewFolderModalVisible(false);
    }
  };

  const handleExecuteVoiceCommand = (cmd: string) => {
    const lower = cmd.toLowerCase().trim();
    if (lower.includes('pause') || lower.includes('stop')) {
      if (isPlaying) togglePlayPause();
      Alert.alert('Voice Command', 'Music playback paused');
      setVoiceModalVisible(false);
    } else if (lower.includes('play') || lower.includes('resume')) {
      if (!isPlaying) togglePlayPause();
      Alert.alert('Voice Command', 'Resuming music playback');
      setVoiceModalVisible(false);
    } else if (lower.includes('next') || lower.includes('skip')) {
      playNext();
      Alert.alert('Voice Command', 'Skipped to next track');
      setVoiceModalVisible(false);
    } else if (lower.includes('prev') || lower.includes('back')) {
      playPrevious();
      Alert.alert('Voice Command', 'Playing previous track');
      setVoiceModalVisible(false);
    } else if (lower.includes('workout') || lower.includes('gym')) {
      const t = REAL_YOUTUBE_TRACKS.find(x => x.moods?.includes('workout'));
      if (t) {
        playTrack({ id: t.id, title: t.title, artist: t.artist, url: t.url, artwork: t.artwork, duration: t.duration * 1000 });
        Alert.alert('Voice Command', `Playing workout music: "${t.title}"`);
      }
      setVoiceModalVisible(false);
    } else if (lower.includes('devotional') || lower.includes('mantra') || lower.includes('chalisa')) {
      const t = REAL_YOUTUBE_TRACKS.find(x => x.moods?.includes('devotional'));
      if (t) {
        playTrack({ id: t.id, title: t.title, artist: t.artist, url: t.url, artwork: t.artwork, duration: t.duration * 1000 });
        Alert.alert('Voice Command', `Playing devotional chants: "${t.title}"`);
      }
      setVoiceModalVisible(false);
    } else if (lower.includes('sleep') || lower.includes('timer')) {
      setSleepTimer(30);
      Alert.alert('Voice Command', 'Sleep timer set for 30 minutes.');
      setVoiceModalVisible(false);
    } else {
      const found = REAL_YOUTUBE_TRACKS.find(x =>
        x.title.toLowerCase().includes(lower) || x.artist.toLowerCase().includes(lower)
      );
      if (found) {
        playTrack({ id: found.id, title: found.title, artist: found.artist, url: found.url, artwork: found.artwork, duration: found.duration * 1000 });
        Alert.alert('Voice Command', `Playing "${found.title}"`);
      } else {
        setOnlineSearchText(cmd);
        setActiveTab('online');
        Alert.alert('Voice Search', `Showing search results for "${cmd}"`);
      }
      setVoiceModalVisible(false);
    }
  };

  const handleGenerateAiPlaylist = async () => {
    const moodKey = aiPlaylistMood.toLowerCase();
    const actKey = aiPlaylistActivity.toLowerCase();
    const name = aiPlaylistTitle.trim() || `AI ${aiPlaylistMood} ${aiPlaylistActivity}`;

    let matched = REAL_YOUTUBE_TRACKS.filter(t =>
      (t.moods && (t.moods.includes(moodKey) || t.moods.includes(actKey)))
    );
    if (matched.length === 0) {
      matched = REAL_YOUTUBE_TRACKS.slice(0, aiPlaylistTrackCount);
    } else {
      matched = matched.slice(0, aiPlaylistTrackCount);
    }

    const coverUrl = matched[0]?.artwork || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400';
    const newPlId = await createPlaylist(name, coverUrl);

    for (const t of matched) {
      await addTrackToPlaylist(newPlId, t.id);
    }

    Alert.alert('AI Playlist Generated', `"${name}" generated with ${matched.length} tracks.`);
    setAiPlaylistModalVisible(false);
    setAiPlaylistTitle('');
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <Animated.View style={[styles.header, { backgroundColor: theme.surface, opacity: tabFade }]}>
        <View style={styles.headerTitleRow}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>AK AUDIO</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TouchableOpacity
              style={[styles.addMusicHeaderBtn, { backgroundColor: theme.primary }]}
              onPress={handleUploadAudio}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={16} color="#FFF" />
              <Text style={styles.addMusicBtnText}>Add Music</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.iconActionBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
              onPress={() => setFeaturesOpen(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="ellipsis-horizontal" size={18} color={theme.text} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Tab Switcher */}
        <View style={styles.tabsRow}>
          {[
            { id: 'online', label: '🔥 Online (YouTube)' },
            { id: 'tracks', label: 'Music' },
            { id: 'videos', label: `Videos (${videoFiles.length})` },
            { id: 'playlists', label: 'Playlists' },
            { id: 'recent', label: 'History' },
          ].map(tab => {
            const isSelected = activeTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                onPress={() => setActiveTab(tab.id as any)}
                style={[
                  styles.tabItem,
                  {
                    borderBottomColor: isSelected ? theme.primary : 'transparent',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.tabLabel,
                    {
                      color: isSelected ? theme.primary : theme.textMuted,
                      fontWeight: isSelected ? '800' : '600',
                    },
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </Animated.View>

      <Animated.View style={{ opacity: tabFade }}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.primary]}
            tintColor={theme.primary}
          />
        }
      >
        {/* Hero Featured Now Playing Card */}
        {currentTrack && (
          <View
            style={[styles.heroCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
          >
            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.heroMetaArea}
              onPress={() => setExpandedNowPlaying(true)}
            >
              <Image
                source={{
                  uri:
                    currentTrack.artwork ||
                    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400',
                }}
                style={styles.heroArtwork}
              />

              <View style={styles.heroMeta}>
                <View style={styles.playingBadge}>
                  <Ionicons name="pulse" size={14} color={theme.primary} />
                  <Text style={[styles.playingBadgeText, { color: theme.primary }]}>
                    {isPlaying ? 'NOW STREAMING' : 'PAUSED'}
                  </Text>
                </View>

                <Text style={[styles.heroTitle, { color: theme.text }]} numberOfLines={1}>
                  {currentTrack.title}
                </Text>
                <Text style={[styles.heroArtist, { color: theme.textMuted }]} numberOfLines={1}>
                  {currentTrack.artist}
                </Text>

                {/* Reactive Micro Visualizer */}
                <View style={styles.microVisualizer}>
                  {visualizerBars.slice(0, 10).map((h, i) => (
                    <View
                      key={`hero-bar-${i}`}
                      style={[
                        styles.heroBar,
                        {
                          height: isPlaying ? h * 0.25 + 4 : 4,
                          backgroundColor: theme.primary,
                        },
                      ]}
                    />
                  ))}
                </View>
              </View>
            </TouchableOpacity>

            {/* BIG Dedicated Play/Pause Button */}
            <TouchableOpacity
              activeOpacity={0.75}
              style={[
                styles.heroPlayBtn,
                {
                  backgroundColor: theme.primary,
                  shadowColor: theme.primary,
                },
              ]}
              onPress={togglePlayPause}
            >
              <Ionicons
                name={isPlaying ? 'pause' : 'play'}
                size={28}
                color="#FFF"
                style={{ marginLeft: isPlaying ? 0 : 2 }}
              />
            </TouchableOpacity>
          </View>
        )}

        {/* Dynamic Tab Body */}
        {/* ONLINE (YOUTUBE) TAB BODY */}
        {activeTab === 'online' && (
          <View style={styles.section}>
            {/* Search Input Bar */}
            <View
              style={[
                styles.onlineSearchBarContainer,
                { backgroundColor: theme.surface, borderColor: theme.border },
              ]}
            >
              <Ionicons name="search" size={20} color={theme.textSubtle} style={{ marginRight: 8 }} />
              <TextInput
                style={[styles.onlineSearchInput, { color: theme.text }]}
                placeholder="Search YouTube songs, artists, videos..."
                placeholderTextColor={theme.textSubtle}
                value={onlineSearchText}
                onChangeText={setOnlineSearchText}
                returnKeyType="search"
                onSubmitEditing={() => handleSearchOnline()}
              />
              {onlineSearchText.length > 0 && (
                <TouchableOpacity
                  onPress={handleClearOnlineSearch}
                  style={{ padding: 6 }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close-circle" size={18} color={theme.textSubtle} />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={() => setVoiceModalVisible(true)}
                style={{ padding: 6, marginRight: 4 }}
                activeOpacity={0.7}
              >
                <Ionicons name="mic" size={18} color={theme.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleSearchOnline()}
                style={[styles.onlineSearchSubmitBtn, { backgroundColor: theme.primary }]}
                activeOpacity={0.8}
              >
                <Text style={styles.onlineSearchSubmitText}>Search</Text>
              </TouchableOpacity>
            </View>

            {/* Category / Genre Filter Chips */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryChipsScroll}
            >
              {ONLINE_CATEGORIES.map(cat => {
                const isSelected = onlineSelectedCategory === cat.id;
                return (
                  <TouchableOpacity
                    key={`cat-${cat.id}`}
                    onPress={() => handleCategorySelect(cat.id)}
                    style={[
                      styles.categoryChip,
                      {
                        backgroundColor: isSelected ? theme.primary : theme.card,
                        borderColor: isSelected ? theme.primary : theme.border,
                      },
                    ]}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.categoryChipText,
                        { color: isSelected ? '#FFF' : theme.textMuted },
                      ]}
                    >
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Section Heading & View Mode (Grid vs List) */}
            <View style={styles.sectionHeadingRow}>
              <Text style={[styles.sectionHeading, { color: theme.textSubtle }]}>
                {isOnlineLoading
                  ? 'SEARCHING YOUTUBE...'
                  : onlineSearchText.trim()
                  ? `RESULTS FOR "${onlineSearchText.trim()}" (${onlineTracks.length})`
                  : `FEATURED TRACKS & VIDEOS (${onlineTracks.length})`}
              </Text>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <TouchableOpacity
                  onPress={() => setOnlineViewMode('grid')}
                  style={[
                    styles.viewModeBtn,
                    {
                      backgroundColor: onlineViewMode === 'grid' ? theme.primary : theme.card,
                      borderColor: theme.border,
                    },
                  ]}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="grid"
                    size={15}
                    color={onlineViewMode === 'grid' ? '#FFF' : theme.textSubtle}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setOnlineViewMode('list')}
                  style={[
                    styles.viewModeBtn,
                    {
                      backgroundColor: onlineViewMode === 'list' ? theme.primary : theme.card,
                      borderColor: theme.border,
                    },
                  ]}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="list"
                    size={16}
                    color={onlineViewMode === 'list' ? '#FFF' : theme.textSubtle}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Loading State */}
            {isOnlineLoading && (
              <View style={styles.onlineLoadingBox}>
                <ActivityIndicator size="large" color={theme.primary} />
                <Text style={[styles.onlineLoadingText, { color: theme.textMuted }]}>
                  Streaming live YouTube search results...
                </Text>
              </View>
            )}

            {/* Empty State */}
            {!isOnlineLoading && onlineTracks.length === 0 && (
              <View style={[styles.emptyContainer, { borderColor: theme.border }]}>
                <Ionicons name="musical-notes-outline" size={44} color={theme.textMuted} />
                <Text style={[styles.emptyTitle, { color: theme.text, marginTop: 10 }]}>
                  No Songs Found
                </Text>
                <Text style={[styles.emptySubtitle, { color: theme.textMuted }]}>
                  Try another keyword or browse our curated trending songs.
                </Text>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: theme.primary, marginTop: 14 }]}
                  onPress={handleClearOnlineSearch}
                >
                  <Text style={styles.actionBtnText}>BROWSE TRENDING SONGS</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Grid View */}
            {!isOnlineLoading && onlineViewMode === 'grid' && (
              <View style={styles.onlineGridContainer}>
                {onlineTracks.map((track, idx) => (
                  <View
                    key={`online-grid-${track.youtubeId || track.id}-${idx}`}
                    style={[
                      styles.onlineGridCard,
                      { backgroundColor: theme.card, borderColor: theme.border },
                    ]}
                  >
                    <TouchableOpacity
                      onPress={() => handlePlayYouTubeTrack(track)}
                      activeOpacity={0.85}
                      style={styles.onlineThumbBox}
                    >
                      <Image
                        source={{ uri: track.artwork }}
                        style={styles.onlineGridThumb}
                        resizeMode="cover"
                      />
                      <View style={styles.onlinePlayOverlay}>
                        <View style={[styles.onlinePlayIconCircle, { backgroundColor: theme.primary }]}>
                          <Ionicons name="play" size={16} color="#FFF" style={{ marginLeft: 2 }} />
                        </View>
                      </View>
                      {track.duration ? (
                        <View style={styles.onlineDurationBadge}>
                          <Text style={styles.onlineDurationText}>
                            {Math.floor(track.duration / 60)}:
                            {String(track.duration % 60).padStart(2, '0')}
                          </Text>
                        </View>
                      ) : null}
                    </TouchableOpacity>

                    <View style={styles.onlineGridBody}>
                      <Text
                        style={[styles.onlineGridTitle, { color: theme.text }]}
                        numberOfLines={2}
                      >
                        {track.title}
                      </Text>
                      <Text
                        style={[styles.onlineGridArtist, { color: theme.textMuted }]}
                        numberOfLines={1}
                      >
                        {track.artist}
                      </Text>

                      <View style={styles.onlineGridFooter}>
                        {track.views ? (
                          <Text style={[styles.onlineViewsText, { color: theme.textSubtle }]}>
                            {track.views}
                          </Text>
                        ) : (
                          <View />
                        )}
                        <TouchableOpacity
                          onPress={() => handleAddOnlineTrackToPlaylist(track)}
                          style={[styles.onlineAddPlBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="add" size={16} color={theme.primary} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* List View */}
            {!isOnlineLoading && onlineViewMode === 'list' && (
              <View style={{ gap: 8 }}>
                {onlineTracks.map((track, idx) => (
                  <TouchableOpacity
                    key={`online-list-${track.youtubeId || track.id}-${idx}`}
                    style={[
                      styles.onlineListCard,
                      { backgroundColor: theme.card, borderColor: theme.border },
                    ]}
                    onPress={() => handlePlayYouTubeTrack(track)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.onlineListThumbWrapper}>
                      <Image
                        source={{ uri: track.artwork }}
                        style={styles.onlineListThumb}
                        resizeMode="cover"
                      />
                      {track.duration ? (
                        <View style={styles.onlineListDurationBadge}>
                          <Text style={styles.onlineDurationText}>
                            {Math.floor(track.duration / 60)}:
                            {String(track.duration % 60).padStart(2, '0')}
                          </Text>
                        </View>
                      ) : null}
                    </View>

                    <View style={styles.onlineListMeta}>
                      <Text
                        style={[styles.onlineListTitle, { color: theme.text }]}
                        numberOfLines={1}
                      >
                        {track.title}
                      </Text>
                      <Text
                        style={[styles.onlineListArtist, { color: theme.textMuted }]}
                        numberOfLines={1}
                      >
                        {track.artist}
                      </Text>
                      {track.views && (
                        <Text style={[styles.onlineViewsText, { color: theme.textSubtle }]}>
                          {track.views}
                        </Text>
                      )}
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <TouchableOpacity
                        onPress={() => handleAddOnlineTrackToPlaylist(track)}
                        style={[styles.onlineAddPlBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="add" size={16} color={theme.primary} />
                      </TouchableOpacity>

                      <View
                        style={[
                          styles.onlinePlayIconCircle,
                          { backgroundColor: theme.primary, width: 34, height: 34, borderRadius: 17 },
                        ]}
                      >
                        <Ionicons name="play" size={15} color="#FFF" style={{ marginLeft: 2 }} />
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        {activeTab === 'tracks' && (
          <View style={styles.section}>
            <View style={styles.sectionHeadingRow}>
              <Text style={[styles.sectionHeading, { color: theme.textSubtle }]}>
                TRACKS ({allTracks.length})
              </Text>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <TouchableOpacity
                  onPress={handleUploadAudio}
                  style={[styles.addTrackSmallBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
                  activeOpacity={0.8}
                >
                  <Ionicons name="add" size={13} color={theme.primary} />
                  <Text style={[styles.addTrackSmallText, { color: theme.primary }]}>Add Songs</Text>
                </TouchableOpacity>

                {hasDemoTracks && (
                  <TouchableOpacity onPress={clearSampleTracks}>
                    <Text style={[styles.clearBtnText, { color: theme.textMuted }]}>
                      CLEAR DEMO TRACKS
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {allTracks.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="musical-notes-outline" size={48} color={theme.textMuted} />
                <Text style={[styles.emptyTitle, { color: theme.text }]}>No Music Found</Text>
                <Text style={[styles.emptySubtitle, { color: theme.textMuted }]}>
                  {'Tap "+ ADD MUSIC" above to upload MP3 and audio tracks'}
                </Text>
              </View>
            ) : (
              allTracks.map((track, idx) => {
                const isSelected = track.id === currentTrack?.id;
                return (
                  <View
                    key={`track-${track.id}-${idx}`}
                    style={[
                      styles.trackRow,
                      {
                        backgroundColor: isSelected ? theme.primaryGlow : theme.card,
                        borderColor: isSelected ? theme.primary : theme.border,
                      },
                    ]}
                  >
                    <TouchableOpacity
                      style={styles.trackContentArea}
                      onPress={() => {
                        if (isSelected) {
                          setExpandedNowPlaying(true);
                        } else {
                          playTrack(track, allTracks);
                        }
                      }}
                      activeOpacity={0.8}
                    >
                      <Image
                        source={{
                          uri:
                            track.artwork ||
                            'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200',
                        }}
                        style={styles.trackThumb}
                      />
                      <View style={styles.trackMeta}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text
                            style={[
                              styles.trackTitle,
                              { color: isSelected ? theme.primary : theme.text },
                            ]}
                            numberOfLines={1}
                          >
                            {track.title}
                          </Text>
                          {isSelected && isPlaying && (
                            <View style={styles.liveTrackWave}>
                              <View style={[styles.inlineWaveBar, { height: 12, backgroundColor: theme.primary }]} />
                              <View style={[styles.inlineWaveBar, { height: 16, backgroundColor: theme.accent }]} />
                              <View style={[styles.inlineWaveBar, { height: 9, backgroundColor: theme.secondary }]} />
                            </View>
                          )}
                        </View>
                        <Text style={[styles.trackArtist, { color: theme.textMuted }]} numberOfLines={1}>
                          {track.artist}
                        </Text>
                      </View>
                    </TouchableOpacity>

                    {/* Dedicated Play / Pause button in track row */}
                    <TouchableOpacity
                      onPress={() => {
                        if (isSelected) {
                          togglePlayPause();
                        } else {
                          playTrack(track, allTracks);
                        }
                      }}
                      style={styles.trackPlayBtn}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={isSelected && isPlaying ? 'pause-circle' : 'play-circle'}
                        size={34}
                        color={isSelected ? theme.primary : theme.textSubtle}
                      />
                    </TouchableOpacity>

                    {/* Track Actions Menu */}
                    <TouchableOpacity
                      onPress={() => openTrackActionsModal(track)}
                      style={{ padding: 8 }}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="ellipsis-vertical" size={18} color={theme.textMuted} />
                    </TouchableOpacity>
                  </View>
                );
              })
            )}
          </View>
        )}

        {activeTab === 'videos' && (
          <View style={styles.section}>
            <View style={styles.sectionHeadingRow}>
              <Text style={[styles.sectionHeading, { color: theme.textSubtle }]}>
                VIDEOS ({videoFiles.length})
              </Text>
              <TouchableOpacity onPress={handleUploadVideos}>
                <Text style={[styles.clearBtnText, { color: theme.primary }]}>
                  + ADD VIDEOS (BULK)
                </Text>
              </TouchableOpacity>
            </View>

            {videoFiles.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="videocam-outline" size={48} color={theme.textMuted} />
                <Text style={[styles.emptyTitle, { color: theme.text }]}>No Videos Uploaded</Text>
                <Text style={[styles.emptySubtitle, { color: theme.textMuted }]}>
                  Upload MP4 and videos with high volume sound and full picture
                </Text>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: theme.primary, marginTop: 14 }]}
                  onPress={handleUploadVideos}
                >
                  <Ionicons name="videocam" size={18} color="#FFF" />
                  <Text style={styles.actionBtnText}>+ ADD VIDEOS NOW</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.videoGrid}>
                {videoFiles.map(video => (
                  <TouchableOpacity
                    key={`vid-${video.id}`}
                    style={[styles.videoCard, { backgroundColor: theme.card, borderColor: theme.border }]}
                    onPress={() => setViewerFile(video)}
                    activeOpacity={0.85}
                  >
                    <View style={styles.videoThumbWrapper}>
                      {video.thumbnailPath || video.uri ? (
                        <Image
                          source={{ uri: video.thumbnailPath || video.uri || video.storagePath }}
                          style={styles.videoThumb}
                        />
                      ) : (
                        <View style={[styles.videoPlaceholder, { backgroundColor: theme.surface }]}>
                          <Ionicons name="film" size={32} color={theme.primary} />
                        </View>
                      )}
                      <View style={styles.videoPlayOverlay}>
                        <Ionicons name="play" size={20} color="#FFF" />
                      </View>
                      <TouchableOpacity
                        style={styles.plDeleteBtn}
                        onPress={(e) => {
                          e.stopPropagation();
                          Alert.alert('Delete Video', `Are you sure you want to delete "${video.name}"?`, [
                            { text: 'Cancel', style: 'cancel' },
                            {
                              text: 'Delete',
                              style: 'destructive',
                              onPress: async () => {
                                await useMediaStore.getState().softDeleteFiles([video.id]);
                                Alert.alert('Deleted', `"${video.name}" has been deleted.`);
                              },
                            },
                          ]);
                        }}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="trash" size={15} color="#FFF" />
                      </TouchableOpacity>
                      {video.durationSeconds ? (
                        <View style={styles.videoDurationBadge}>
                          <Text style={styles.videoDurationText}>
                            {Math.floor(video.durationSeconds / 60)}:{(video.durationSeconds % 60).toString().padStart(2, '0')}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                    <View style={styles.videoCardMeta}>
                      <View style={{ flex: 1, marginRight: 6 }}>
                        <Text style={[styles.videoCardTitle, { color: theme.text }]} numberOfLines={1}>
                          {video.name}
                        </Text>
                        <Text style={[styles.videoCardSub, { color: theme.textMuted }]}>
                          {(video.sizeBytes / (1024 * 1024)).toFixed(1)} MB • VIDEO
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={{ padding: 6, justifyContent: 'center', alignItems: 'center' }}
                        onPress={(e) => {
                          e.stopPropagation();
                          openVideoActionsModal(video);
                        }}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="ellipsis-vertical" size={18} color={theme.textMuted} />
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        {activeTab === 'playlists' && (
          <View style={styles.section}>
            <View style={styles.sectionHeadingRow}>
              <Text style={[styles.sectionHeading, { color: theme.textSubtle }]}>
                PLAYLISTS ({playlists.length})
              </Text>
              <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                <TouchableOpacity
                  onPress={() => setAiPlaylistModalVisible(true)}
                  style={{
                    backgroundColor: 'rgba(168, 85, 247, 0.15)',
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 6,
                    borderWidth: 1,
                    borderColor: 'rgba(168, 85, 247, 0.3)',
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <Ionicons name="sparkles" size={13} color="#A855F7" />
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#A855F7' }}>AI GENERATOR</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setPlaylistModalVisible(true)}>
                  <Text style={[styles.clearBtnText, { color: theme.primary }]}>
                    + NEW PLAYLIST
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {playlists.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="folder-open-outline" size={48} color={theme.textMuted} />
                <Text style={[styles.emptyTitle, { color: theme.text }]}>No Playlists Yet</Text>
                <Text style={[styles.emptySubtitle, { color: theme.textMuted }]}>
                  Create custom playlists to organize your favorite tracks
                </Text>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: theme.primary, marginTop: 14 }]}
                  onPress={() => setPlaylistModalVisible(true)}
                >
                  <Ionicons name="add" size={18} color="#FFF" />
                  <Text style={styles.actionBtnText}>CREATE PLAYLIST</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.playlistGrid}>
                {playlists.map(pl => {
                  const plTrackCount = pl.trackIds?.length ?? pl.itemCount ?? 0;
                  return (
                    <TouchableOpacity
                      key={pl.id}
                      style={[styles.plCard, { backgroundColor: theme.card, borderColor: theme.border }]}
                      onPress={() => setSelectedPlaylistForView(pl)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.plCoverWrapper}>
                        <Image
                          source={{
                            uri:
                              pl.coverUrl ||
                              'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400',
                          }}
                          style={styles.plCover}
                        />
                        <TouchableOpacity
                          style={styles.plDeleteBtn}
                          onPress={(e) => {
                            e.stopPropagation();
                            Alert.alert('Playlist Options', pl.name, [
                              {
                                text: '✏️ Edit Name',
                                onPress: () => openRenamePlaylistModal(pl),
                              },
                              {
                                text: '🖼️ Change Cover Page',
                                onPress: () => handleChangePlaylistCover(pl),
                              },
                              {
                                text: '🗑️ Delete Playlist',
                                style: 'destructive',
                                onPress: () => {
                                  Alert.alert('Delete Playlist', `Delete playlist "${pl.name}"?`, [
                                    { text: 'Cancel', style: 'cancel' },
                                    {
                                      text: 'Delete',
                                      style: 'destructive',
                                      onPress: () => deletePlaylist(pl.id),
                                    },
                                  ]);
                                },
                              },
                              { text: 'Cancel', style: 'cancel' },
                            ]);
                          }}
                        >
                          <Ionicons name="ellipsis-vertical" size={16} color="#FFF" />
                        </TouchableOpacity>
                      </View>
                      <Text style={[styles.plTitle, { color: theme.text }]} numberOfLines={1}>
                        {pl.name}
                      </Text>
                      <Text style={[styles.plSub, { color: theme.textMuted }]}>
                        {plTrackCount} Tracks
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* Custom Folders Section in Music Hub */}
            <View style={{ marginTop: 28 }}>
              <View style={styles.sectionHeadingRow}>
                <Text style={[styles.sectionHeading, { color: theme.textSubtle }]}>
                  CUSTOM FOLDERS ({folders.length})
                </Text>
                <TouchableOpacity onPress={() => setNewFolderModalVisible(true)}>
                  <Text style={[styles.clearBtnText, { color: theme.primary }]}>
                    + NEW FOLDER
                  </Text>
                </TouchableOpacity>
              </View>

              {folders.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="folder-outline" size={40} color={theme.textMuted} />
                  <Text style={[styles.emptyTitle, { color: theme.text, fontSize: 16 }]}>No Folders Created</Text>
                  <Text style={[styles.emptySubtitle, { color: theme.textMuted }]}>
                    Create custom folders to organize your music and videos
                  </Text>
                </View>
              ) : (
                <View style={styles.playlistGrid}>
                  {folders.map(folder => {
                    const folderItems = files.filter(f => !f.isDeleted && f.folderId === folder.id);
                    return (
                      <View
                        key={folder.id}
                        style={[styles.plCard, { backgroundColor: theme.card, borderColor: theme.border }]}
                      >
                        <View style={styles.plCoverWrapper}>
                          {folder.coverUri ? (
                            <Image source={{ uri: folder.coverUri }} style={styles.plCover} />
                          ) : (
                            <View style={[styles.plCover, { backgroundColor: folder.color + '25', justifyContent: 'center', alignItems: 'center' }]}>
                              <Ionicons name="folder" size={42} color={folder.color} />
                            </View>
                          )}
                          <TouchableOpacity
                            style={styles.plDeleteBtn}
                            onPress={() => {
                              Alert.alert('Folder Options', folder.name, [
                                {
                                  text: '✏️ Edit Name',
                                  onPress: () => openRenameFolderModal(folder),
                                },
                                {
                                  text: '🖼️ Change Cover Page',
                                  onPress: () => handleChangeFolderCover(folder),
                                },
                                {
                                  text: '🗑️ Delete Folder',
                                  style: 'destructive',
                                  onPress: () => handleDeleteFolderWithConfirm(folder),
                                },
                                { text: 'Cancel', style: 'cancel' },
                              ]);
                            }}
                          >
                            <Ionicons name="ellipsis-vertical" size={16} color="#FFF" />
                          </TouchableOpacity>
                        </View>
                        <Text style={[styles.plTitle, { color: theme.text }]} numberOfLines={1}>
                          {folder.name}
                        </Text>
                        <Text style={[styles.plSub, { color: theme.textMuted }]}>
                          {folderItems.length} {folderItems.length === 1 ? 'item' : 'items'}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          </View>
        )}

        {activeTab === 'recent' && (
          <View style={styles.section}>
            <Text style={[styles.sectionHeading, { color: theme.textSubtle }]}>
              RECENTLY STREAMED ({recentlyPlayed.length})
            </Text>
            {recentlyPlayed.map((track, idx) => {
              const isSelected = track.id === currentTrack?.id;
              return (
                <View
                  key={`recent-${track.id}-${idx}`}
                  style={[
                    styles.trackRow,
                    {
                      backgroundColor: isSelected ? theme.primaryGlow : theme.card,
                      borderColor: isSelected ? theme.primary : theme.border,
                    },
                  ]}
                >
                  <TouchableOpacity
                    style={styles.trackContentArea}
                    onPress={() => {
                      if (isSelected) {
                        setExpandedNowPlaying(true);
                      } else {
                        playTrack(track);
                      }
                    }}
                    activeOpacity={0.8}
                  >
                    <Image
                      source={{
                        uri:
                          track.artwork ||
                          'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200',
                      }}
                      style={styles.trackThumb}
                    />
                    <View style={styles.trackMeta}>
                      <Text
                        style={[
                          styles.trackTitle,
                          { color: isSelected ? theme.primary : theme.text },
                        ]}
                        numberOfLines={1}
                      >
                        {track.title}
                      </Text>
                      <Text style={[styles.trackArtist, { color: theme.textMuted }]} numberOfLines={1}>
                        {track.artist}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {/* Dedicated Play / Pause button in History */}
                  <TouchableOpacity
                    onPress={() => {
                      if (isSelected) {
                        togglePlayPause();
                      } else {
                        playTrack(track);
                      }
                    }}
                    style={styles.trackPlayBtn}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={isSelected && isPlaying ? 'pause-circle' : 'play-circle'}
                      size={34}
                      color={isSelected ? theme.primary : theme.textSubtle}
                    />
                  </TouchableOpacity>

                  {/* Track Actions Menu in History */}
                  <TouchableOpacity
                    onPress={() => openTrackActionsModal(track)}
                    style={{ padding: 8 }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="ellipsis-vertical" size={18} color={theme.textMuted} />
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
      </Animated.View>

      {/* Rename Track Modal */}
      <Modal
        visible={renameModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRenameModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setRenameModalVisible(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={e => e.stopPropagation()}
            style={[styles.modalBox, { backgroundColor: theme.surface, borderColor: theme.border }]}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={[styles.modalTitle, { color: theme.text, marginBottom: 0 }]}>RENAME TRACK</Text>
              <TouchableOpacity onPress={() => setRenameModalVisible(false)}>
                <Ionicons name="close" size={20} color={theme.textSubtle} />
              </TouchableOpacity>
            </View>
            <TextInput
              placeholder="Track Title"
              placeholderTextColor={theme.textSubtle}
              value={newTrackTitle}
              onChangeText={setNewTrackTitle}
              style={[
                styles.modalInput,
                { color: theme.text, backgroundColor: theme.card, borderColor: theme.border },
              ]}
              autoFocus
            />
            <TextInput
              placeholder="Artist Name (optional)"
              placeholderTextColor={theme.textSubtle}
              value={newTrackArtist}
              onChangeText={setNewTrackArtist}
              style={[
                styles.modalInput,
                { color: theme.text, backgroundColor: theme.card, borderColor: theme.border },
              ]}
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setRenameModalVisible(false)}
              >
                <Text style={{ color: theme.textMuted, fontWeight: '700' }}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirm, { backgroundColor: theme.primary }]}
                onPress={handleSaveRename}
              >
                <Text style={{ color: '#FFF', fontWeight: '800' }}>SAVE</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Create Playlist Modal */}
      <Modal
        visible={playlistModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPlaylistModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setPlaylistModalVisible(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={e => e.stopPropagation()}
            style={[styles.modalBox, { backgroundColor: theme.surface, borderColor: theme.border }]}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={[styles.modalTitle, { color: theme.text, marginBottom: 0 }]}>NEW PLAYLIST</Text>
              <TouchableOpacity onPress={() => setPlaylistModalVisible(false)}>
                <Ionicons name="close" size={20} color={theme.textSubtle} />
              </TouchableOpacity>
            </View>
            <TextInput
              placeholder="Playlist Title"
              placeholderTextColor={theme.textSubtle}
              value={newPlaylistName}
              onChangeText={setNewPlaylistName}
              style={[
                styles.modalInput,
                { color: theme.text, backgroundColor: theme.card, borderColor: theme.border },
              ]}
              autoFocus
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setPlaylistModalVisible(false)}
              >
                <Text style={{ color: theme.textMuted, fontWeight: '700' }}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirm, { backgroundColor: theme.primary }]}
                onPress={handleCreatePlaylist}
              >
                <Text style={{ color: '#FFF', fontWeight: '800' }}>CREATE</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Playlist Detail Full Modal */}
      <Modal
        visible={!!selectedPlaylistForView}
        animationType="slide"
        onRequestClose={() => setSelectedPlaylistForView(null)}
      >
        {selectedPlaylistForView && (() => {
          const activePl = playlists.find(p => p.id === selectedPlaylistForView.id) || selectedPlaylistForView;
          const plTrackIds = new Set(activePl.trackIds || []);
          const plTracks = Array.from(plTrackIds).map(id => {
            const local = allTracks.find(t => t.id === id);
            if (local) return local;
            const online = CURATED_YOUTUBE_CATALOG.find(t => t.id === id || t.youtubeId === id) ||
                           onlineTracks.find(t => t.id === id || t.youtubeId === id);
            if (online) {
              return {
                id: online.id,
                title: online.title,
                artist: online.artist,
                album: 'YouTube Music',
                artwork: online.artwork,
                url: online.url,
                duration: online.duration || 210,
                isOnline: true,
                youtubeId: online.youtubeId,
              } as Track;
            }
            return null;
          }).filter(Boolean) as Track[];

          return (
            <View style={[styles.container, { backgroundColor: theme.background }]}>
              {/* Header */}
              <View style={[styles.header, { backgroundColor: theme.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 54, paddingBottom: 16 }]}>
                <TouchableOpacity
                  onPress={() => setSelectedPlaylistForView(null)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
                >
                  <Ionicons name="chevron-back" size={24} color={theme.text} />
                  <Text style={[styles.headerTitle, { color: theme.text, fontSize: 18 }]} numberOfLines={1}>
                    {activePl.name}
                  </Text>
                </TouchableOpacity>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <TouchableOpacity
                    onPress={() => openRenamePlaylistModal(activePl)}
                    style={{ padding: 6 }}
                  >
                    <Ionicons name="pencil-outline" size={20} color={theme.primary} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => {
                      Alert.alert('Delete Playlist', `Delete "${activePl.name}"?`, [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Delete',
                          style: 'destructive',
                          onPress: () => {
                            deletePlaylist(activePl.id);
                            setSelectedPlaylistForView(null);
                          },
                        },
                      ]);
                    }}
                    style={{ padding: 6 }}
                  >
                    <Ionicons name="trash-outline" size={20} color={theme.danger} />
                  </TouchableOpacity>

                  {/* Explicit Close Button in Playlist Header */}
                  <TouchableOpacity
                    onPress={() => setSelectedPlaylistForView(null)}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      backgroundColor: theme.card,
                      justifyContent: 'center',
                      alignItems: 'center',
                      marginLeft: 4,
                      borderWidth: 1,
                      borderColor: theme.border,
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="close" size={18} color={theme.text} />
                  </TouchableOpacity>
                </View>
              </View>

              <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
                {/* Playlist Banner */}
                <View style={[styles.heroCard, { backgroundColor: theme.surface, borderColor: theme.border, marginBottom: 20 }]}>
                  <View style={{ position: 'relative' }}>
                    <Image
                      source={{
                        uri: activePl.coverUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400',
                      }}
                      style={styles.heroArtwork}
                    />
                    <TouchableOpacity
                      style={{
                        position: 'absolute',
                        bottom: 4,
                        right: 4,
                        backgroundColor: 'rgba(0,0,0,0.75)',
                        paddingHorizontal: 6,
                        paddingVertical: 3,
                        borderRadius: 8,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 3,
                      }}
                      onPress={() => handleChangePlaylistCover(activePl)}
                    >
                      <Ionicons name="camera" size={11} color="#FFF" />
                      <Text style={{ color: '#FFF', fontSize: 9, fontWeight: '700' }}>Cover</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.heroMeta}>
                    <Text style={[styles.heroTitle, { color: theme.text }]} numberOfLines={2}>
                      {activePl.name}
                    </Text>
                    <Text style={[styles.heroArtist, { color: theme.textMuted }]}>
                      {plTracks.length} {plTracks.length === 1 ? 'song' : 'songs'} • {activePl.description || 'Custom Playlist'}
                    </Text>

                    <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                      {plTracks.length > 0 && (
                        <TouchableOpacity
                          style={[styles.actionBtn, { backgroundColor: theme.primary, paddingHorizontal: 16 }]}
                          onPress={() => {
                            const first = plTracks[0];
                            if ((first as any).isOnline || (first as any).youtubeId) {
                              handlePlayYouTubeTrack(first);
                            } else {
                              playTrack(first, plTracks);
                            }
                          }}
                        >
                          <Ionicons name="play" size={16} color="#FFF" />
                          <Text style={styles.actionBtnText}>PLAY ALL</Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1, paddingHorizontal: 16 }]}
                        onPress={() => setAddSongsToPlaylistModalVisible(true)}
                      >
                        <Ionicons name="add" size={18} color={theme.primary} />
                        <Text style={[styles.actionBtnText, { color: theme.primary }]}>ADD SONGS</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                {/* Playlist Tracks List */}
                <Text style={[styles.sectionHeading, { color: theme.textSubtle, marginBottom: 12 }]}>
                  TRACKS IN PLAYLIST ({plTracks.length})
                </Text>

                {plTracks.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Ionicons name="musical-notes-outline" size={44} color={theme.textMuted} />
                    <Text style={[styles.emptyTitle, { color: theme.text, marginTop: 10 }]}>Playlist is Empty</Text>
                    <Text style={[styles.emptySubtitle, { color: theme.textMuted }]}>
                      Add songs from your uploaded music library to this playlist
                    </Text>
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: theme.primary, marginTop: 14 }]}
                      onPress={() => setAddSongsToPlaylistModalVisible(true)}
                    >
                      <Ionicons name="add" size={18} color="#FFF" />
                      <Text style={styles.actionBtnText}>+ ADD SONGS NOW</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  plTracks.map((track, idx) => {
                    const isSelected = track.id === currentTrack?.id;
                    return (
                      <View
                        key={`pl-track-${track.id}-${idx}`}
                        style={[
                          styles.trackRow,
                          {
                            backgroundColor: isSelected ? theme.primaryGlow : theme.card,
                            borderColor: isSelected ? theme.primary : theme.border,
                          },
                        ]}
                      >
                        <TouchableOpacity
                          style={styles.trackContentArea}
                          onPress={() => {
                            if ((track as any).isOnline || (track as any).youtubeId) {
                              handlePlayYouTubeTrack(track);
                            } else {
                              playTrack(track, plTracks);
                            }
                          }}
                          activeOpacity={0.8}
                        >
                          <Image
                            source={{
                              uri: track.artwork || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200',
                            }}
                            style={styles.trackThumb}
                          />
                          <View style={styles.trackMeta}>
                            <Text style={[styles.trackTitle, { color: isSelected ? theme.primary : theme.text }]} numberOfLines={1}>
                              {track.title}
                            </Text>
                            <Text style={[styles.trackArtist, { color: theme.textMuted }]} numberOfLines={1}>
                              {track.artist}
                            </Text>
                          </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => {
                            if ((track as any).isOnline || (track as any).youtubeId) {
                              handlePlayYouTubeTrack(track);
                            } else if (isSelected) {
                              togglePlayPause();
                            } else {
                              playTrack(track, plTracks);
                            }
                          }}
                          style={styles.trackPlayBtn}
                          activeOpacity={0.7}
                        >
                          <Ionicons
                            name={isSelected && isPlaying ? 'pause-circle' : 'play-circle'}
                            size={32}
                            color={isSelected ? theme.primary : theme.textSubtle}
                          />
                        </TouchableOpacity>

                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                          <TouchableOpacity
                            onPress={() => openTrackActionsModal(track)}
                            style={{ padding: 6 }}
                            activeOpacity={0.7}
                          >
                            <Ionicons name="ellipsis-vertical" size={18} color={theme.textMuted} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => removeTrackFromPlaylist(activePl.id, track.id)}
                            style={{ padding: 6 }}
                            activeOpacity={0.7}
                          >
                            <Ionicons name="close-circle-outline" size={20} color={theme.danger} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })
                )}

                {/* Explicit Bottom Close Button */}
                <TouchableOpacity
                  style={[
                    styles.actionBtn,
                    {
                      backgroundColor: theme.card,
                      borderColor: theme.border,
                      borderWidth: 1,
                      marginTop: 24,
                      marginBottom: 20,
                      paddingVertical: 12,
                      justifyContent: 'center',
                      alignItems: 'center',
                      flexDirection: 'row',
                      gap: 8,
                    },
                  ]}
                  onPress={() => setSelectedPlaylistForView(null)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="close-circle-outline" size={18} color={theme.textMuted} />
                  <Text style={[styles.actionBtnText, { color: theme.text, fontSize: 13 }]}>
                    CLOSE PLAYLIST
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          );
        })()}
      </Modal>

      {/* Add Single Track to Playlist Modal */}
      <Modal
        visible={addToPlaylistModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAddToPlaylistModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setAddToPlaylistModalVisible(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={e => e.stopPropagation()}
            style={[styles.modalBox, { backgroundColor: theme.surface, borderColor: theme.border, maxHeight: '80%' }]}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={[styles.modalTitle, { color: theme.text, marginBottom: 0 }]}>
                ADD TO PLAYLIST
              </Text>
              <TouchableOpacity onPress={() => setAddToPlaylistModalVisible(false)}>
                <Ionicons name="close" size={20} color={theme.textSubtle} />
              </TouchableOpacity>
            </View>
            <Text style={{ color: theme.textMuted, fontSize: 12, marginBottom: 14 }}>
              {'Select a playlist for "' + (targetTrackForPlaylist?.title || '') + '":'}
            </Text>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 260 }}>
              {playlists.length === 0 ? (
                <View style={{ alignItems: 'center', paddingVertical: 18 }}>
                  <Text style={{ color: theme.textMuted, fontSize: 13 }}>No playlists created yet.</Text>
                </View>
              ) : (
                playlists.map(pl => {
                  const isAlreadyIn = (pl.trackIds || []).includes(targetTrackForPlaylist?.id || '');
                  return (
                    <TouchableOpacity
                      key={pl.id}
                      style={[styles.plSelectRow, { borderColor: theme.border, backgroundColor: theme.card }]}
                      onPress={() => handleAddTrackToSpecificPlaylist(pl.id)}
                      activeOpacity={0.7}
                    >
                      <Image
                        source={{ uri: pl.coverUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400' }}
                        style={styles.plSelectThumb}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: theme.text, fontWeight: '700', fontSize: 14 }}>{pl.name}</Text>
                        <Text style={{ color: theme.textMuted, fontSize: 11 }}>
                          {(pl.trackIds || []).length} Tracks {isAlreadyIn ? '• Already Added' : ''}
                        </Text>
                      </View>
                      <Ionicons
                        name={isAlreadyIn ? 'checkmark-circle' : 'add-circle-outline'}
                        size={22}
                        color={isAlreadyIn ? theme.primary : theme.textSubtle}
                      />
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
              <TouchableOpacity
                style={[styles.modalConfirm, { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1, flex: 1, alignItems: 'center' }]}
                onPress={() => {
                  setAddToPlaylistModalVisible(false);
                  setPlaylistModalVisible(true);
                }}
              >
                <Text style={{ color: theme.primary, fontWeight: '800' }}>+ NEW PLAYLIST</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setAddToPlaylistModalVisible(false)}
              >
                <Text style={{ color: theme.textMuted, fontWeight: '700' }}>CANCEL</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Add Songs Picker to Currently Viewed Playlist */}
      <Modal
        visible={addSongsToPlaylistModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAddSongsToPlaylistModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setAddSongsToPlaylistModalVisible(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={e => e.stopPropagation()}
            style={[styles.modalBox, { backgroundColor: theme.surface, borderColor: theme.border, maxHeight: '85%' }]}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={[styles.modalTitle, { color: theme.text, marginBottom: 0 }]}>
                SELECT SONGS
              </Text>
              <TouchableOpacity onPress={() => setAddSongsToPlaylistModalVisible(false)}>
                <Ionicons name="close" size={20} color={theme.textSubtle} />
              </TouchableOpacity>
            </View>
            <Text style={{ color: theme.textMuted, fontSize: 12, marginBottom: 12 }}>
              Tap any song to add or remove from this playlist:
            </Text>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 320 }}>
              {allTracks.length === 0 ? (
                <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                  <Text style={{ color: theme.textMuted }}>No tracks available in library.</Text>
                </View>
              ) : (
                allTracks.map(track => {
                  const activePl = selectedPlaylistForView ? (playlists.find(p => p.id === selectedPlaylistForView.id) || selectedPlaylistForView) : null;
                  const isChecked = (activePl?.trackIds || []).includes(track.id);

                  return (
                    <TouchableOpacity
                      key={`pick-song-${track.id}`}
                      style={[
                        styles.plSelectRow,
                        {
                          borderColor: isChecked ? theme.primary : theme.border,
                          backgroundColor: isChecked ? theme.primaryGlow : theme.card,
                        },
                      ]}
                      onPress={async () => {
                        if (!activePl) return;
                        if (isChecked) {
                          await removeTrackFromPlaylist(activePl.id, track.id);
                        } else {
                          await addTrackToPlaylist(activePl.id, track.id);
                        }
                      }}
                      activeOpacity={0.7}
                    >
                      <Image
                        source={{ uri: track.artwork || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200' }}
                        style={styles.plSelectThumb}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: theme.text, fontWeight: '700', fontSize: 13 }} numberOfLines={1}>
                          {track.title}
                        </Text>
                        <Text style={{ color: theme.textMuted, fontSize: 11 }} numberOfLines={1}>
                          {track.artist}
                        </Text>
                      </View>
                      <Ionicons
                        name={isChecked ? 'checkbox' : 'square-outline'}
                        size={22}
                        color={isChecked ? theme.primary : theme.textSubtle}
                      />
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 14, alignItems: 'center' }}>
              <TouchableOpacity
                style={[styles.modalCancel, { flex: 1, alignItems: 'center' }]}
                onPress={() => setAddSongsToPlaylistModalVisible(false)}
              >
                <Text style={{ color: theme.textMuted, fontWeight: '700' }}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirm, { backgroundColor: theme.primary, flex: 1, alignItems: 'center' }]}
                onPress={() => setAddSongsToPlaylistModalVisible(false)}
              >
                <Text style={{ color: '#FFF', fontWeight: '800' }}>DONE</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Move Song to Folder Modal */}
      <Modal
        visible={moveTrackToFolderModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMoveTrackToFolderModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setMoveTrackToFolderModalVisible(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={e => e.stopPropagation()}
            style={[styles.modalBox, { backgroundColor: theme.surface, borderColor: theme.border, maxHeight: '80%' }]}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={[styles.modalTitle, { color: theme.text, marginBottom: 0 }]}>
                MOVE TO FOLDER
              </Text>
              <TouchableOpacity onPress={() => setMoveTrackToFolderModalVisible(false)}>
                <Ionicons name="close" size={20} color={theme.textSubtle} />
              </TouchableOpacity>
            </View>
            <Text style={{ color: theme.textMuted, fontSize: 12, marginBottom: 14 }}>
              {'Move "' + (targetTrackForFolder?.title || '') + '" into a folder:'}
            </Text>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 260 }}>
              {/* Option 1: Root */}
              <TouchableOpacity
                style={[styles.plSelectRow, { borderColor: theme.border, backgroundColor: theme.card }]}
                onPress={() => handleMoveTrackToFolder(null)}
                activeOpacity={0.7}
              >
                <View style={[styles.folderIconBadge, { backgroundColor: theme.primaryGlow }]}>
                  <Ionicons name="home-outline" size={20} color={theme.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.text, fontWeight: '700', fontSize: 14 }}>Root Library (No Folder)</Text>
                  <Text style={{ color: theme.textMuted, fontSize: 11 }}>Keep in main library</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={theme.textSubtle} />
              </TouchableOpacity>

              {/* Folders List */}
              {folders.map(folder => {
                const count = files.filter(f => !f.isDeleted && f.folderId === folder.id).length;
                return (
                  <TouchableOpacity
                    key={folder.id}
                    style={[styles.plSelectRow, { borderColor: theme.border, backgroundColor: theme.card }]}
                    onPress={() => handleMoveTrackToFolder(folder.id)}
                    activeOpacity={0.7}
                  >
                    {folder.coverUri ? (
                      <Image source={{ uri: folder.coverUri }} style={{ width: 36, height: 36, borderRadius: 8, marginRight: 12 }} />
                    ) : (
                      <View style={[styles.folderIconBadge, { backgroundColor: folder.color + '25' }]}>
                        <Ionicons name="folder" size={20} color={folder.color} />
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: theme.text, fontWeight: '700', fontSize: 14 }}>{folder.name}</Text>
                      <Text style={{ color: theme.textMuted, fontSize: 11 }}>{count} items</Text>
                    </View>
                    <TouchableOpacity
                      style={{ padding: 8 }}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleChangeFolderCover(folder);
                      }}
                    >
                      <Ionicons name="camera-outline" size={17} color={theme.accent} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={{ padding: 8 }}
                      onPress={(e) => {
                        e.stopPropagation();
                        Alert.alert('Delete Folder', `Delete "${folder.name}"? Files will be kept in main library.`, [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Delete',
                            style: 'destructive',
                            onPress: async () => {
                              await deleteFolder(folder.id);
                              Alert.alert('Folder Deleted', `Folder "${folder.name}" has been deleted.`);
                            },
                          },
                        ]);
                      }}
                    >
                      <Ionicons name="trash-outline" size={17} color={theme.danger || '#EF4444'} />
                    </TouchableOpacity>
                    <Ionicons name="chevron-forward" size={16} color={theme.textSubtle} />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
              <TouchableOpacity
                style={[styles.modalConfirm, { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1, flex: 1, alignItems: 'center' }]}
                onPress={() => {
                  setMoveTrackToFolderModalVisible(false);
                  setNewFolderModalVisible(true);
                }}
              >
                <Text style={{ color: theme.primary, fontWeight: '800' }}>+ NEW FOLDER</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setMoveTrackToFolderModalVisible(false)}
              >
                <Text style={{ color: theme.textMuted, fontWeight: '700' }}>CANCEL</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Create New Folder from Music Screen */}
      {/* Create New Folder from Music Screen */}
      <Modal
        visible={newFolderModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setNewFolderModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setNewFolderModalVisible(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={e => e.stopPropagation()}
            style={[styles.modalBox, { backgroundColor: theme.surface, borderColor: theme.border }]}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={[styles.modalTitle, { color: theme.text, marginBottom: 0 }]}>NEW FOLDER</Text>
              <TouchableOpacity onPress={() => setNewFolderModalVisible(false)}>
                <Ionicons name="close" size={20} color={theme.textSubtle} />
              </TouchableOpacity>
            </View>
            <TextInput
              placeholder="Folder Name"
              placeholderTextColor={theme.textSubtle}
              value={newFolderName}
              onChangeText={setNewFolderName}
              style={[
                styles.modalInput,
                { color: theme.text, backgroundColor: theme.card, borderColor: theme.border },
              ]}
              autoFocus
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setNewFolderModalVisible(false)}
              >
                <Text style={{ color: theme.textMuted, fontWeight: '700' }}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirm, { backgroundColor: theme.primary }]}
                onPress={handleCreateFolderFromMusic}
              >
                <Text style={{ color: '#FFF', fontWeight: '800' }}>CREATE</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Track 3-Dots Action Sheet Modal */}
      <Modal
        visible={trackActionsModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setTrackActionsModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setTrackActionsModalVisible(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={e => e.stopPropagation()}
            style={[styles.modalBox, { backgroundColor: theme.surface, borderColor: theme.border }]}
          >
            {/* Header with track info & close (X) button */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, marginRight: 8 }}>
                <Image
                  source={{ uri: selectedTrackForActions?.artwork || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200' }}
                  style={{ width: 44, height: 44, borderRadius: 10 }}
                />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.text, fontWeight: '800', fontSize: 15 }} numberOfLines={1}>
                    {selectedTrackForActions?.title}
                  </Text>
                  <Text style={{ color: theme.textMuted, fontSize: 12 }} numberOfLines={1}>
                    {selectedTrackForActions?.artist || 'Uploaded Track'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setTrackActionsModalVisible(false)}
                style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: theme.card, justifyContent: 'center', alignItems: 'center' }}
              >
                <Ionicons name="close" size={18} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Actions List */}
            <TouchableOpacity
              style={styles.actionSheetRow}
              onPress={() => {
                const tr = selectedTrackForActions;
                setTrackActionsModalVisible(false);
                if (tr) openRenameModal(tr);
              }}
            >
              <View style={[styles.actionIconBox, { backgroundColor: theme.primaryGlow }]}>
                <Ionicons name="pencil" size={18} color={theme.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.actionSheetText, { color: theme.text }]}>Edit Song Details</Text>
                <Text style={styles.actionSheetSub}>Rename track title & artist name</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.textSubtle} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionSheetRow}
              onPress={() => {
                const tr = selectedTrackForActions;
                setTrackActionsModalVisible(false);
                if (tr) handlePickArtworkForTrack(tr);
              }}
            >
              <View style={[styles.actionIconBox, { backgroundColor: 'rgba(236,72,153,0.15)' }]}>
                <Ionicons name="image" size={18} color={theme.secondary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.actionSheetText, { color: theme.text }]}>Change Cover Artwork</Text>
                <Text style={styles.actionSheetSub}>Select custom rectangular picture</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.textSubtle} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionSheetRow}
              onPress={() => {
                const tr = selectedTrackForActions;
                setTrackActionsModalVisible(false);
                if (tr) openAddToPlaylistModal(tr);
              }}
            >
              <View style={[styles.actionIconBox, { backgroundColor: theme.primaryGlow }]}>
                <Ionicons name="musical-notes" size={18} color={theme.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.actionSheetText, { color: theme.text }]}>Add to Playlist</Text>
                <Text style={styles.actionSheetSub}>Save into custom playlist</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.textSubtle} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionSheetRow}
              onPress={() => {
                const tr = selectedTrackForActions;
                setTrackActionsModalVisible(false);
                if (tr) openMoveTrackToFolderModal(tr);
              }}
            >
              <View style={[styles.actionIconBox, { backgroundColor: 'rgba(59,130,246,0.15)' }]}>
                <Ionicons name="folder" size={18} color="#3B82F6" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.actionSheetText, { color: theme.text }]}>Move to Folder</Text>
                <Text style={styles.actionSheetSub}>Organize inside folders</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.textSubtle} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionSheetRow}
              onPress={() => {
                const tr = selectedTrackForActions;
                setTrackActionsModalVisible(false);
                if (tr) handleDeleteTrackWithConfirm(tr);
              }}
            >
              <View style={[styles.actionIconBox, { backgroundColor: 'rgba(239,68,68,0.15)' }]}>
                <Ionicons name="trash-outline" size={18} color={theme.danger} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.actionSheetText, { color: theme.danger }]}>Delete Song</Text>
                <Text style={styles.actionSheetSub}>Remove from library and player</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.textSubtle} />
            </TouchableOpacity>

            {/* Close Button */}
            <TouchableOpacity
              style={[styles.modalCancel, { marginTop: 10, alignItems: 'center' }]}
              onPress={() => setTrackActionsModalVisible(false)}
            >
              <Text style={{ color: theme.textMuted, fontWeight: '800' }}>CLOSE</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Edit / Rename Song Details Modal */}
      <Modal
        visible={renameModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRenameModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setRenameModalVisible(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={e => e.stopPropagation()}
            style={[styles.modalBox, { backgroundColor: theme.surface, borderColor: theme.border }]}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={[styles.modalTitle, { color: theme.text, marginBottom: 0 }]}>
                EDIT SONG DETAILS
              </Text>
              <TouchableOpacity onPress={() => setRenameModalVisible(false)}>
                <Ionicons name="close" size={20} color={theme.textSubtle} />
              </TouchableOpacity>
            </View>

            <Text style={{ color: theme.textMuted, fontSize: 11, fontWeight: '700', marginBottom: 4 }}>
              SONG TITLE
            </Text>
            <TextInput
              placeholder="Song Name"
              placeholderTextColor={theme.textSubtle}
              value={newTrackTitle}
              onChangeText={setNewTrackTitle}
              style={[
                styles.modalInput,
                { color: theme.text, backgroundColor: theme.card, borderColor: theme.border },
              ]}
              autoFocus
            />

            <Text style={{ color: theme.textMuted, fontSize: 11, fontWeight: '700', marginBottom: 4 }}>
              ARTIST / SINGER
            </Text>
            <TextInput
              placeholder="Artist Name"
              placeholderTextColor={theme.textSubtle}
              value={newTrackArtist}
              onChangeText={setNewTrackArtist}
              style={[
                styles.modalInput,
                { color: theme.text, backgroundColor: theme.card, borderColor: theme.border },
              ]}
            />

            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setRenameModalVisible(false)}
              >
                <Text style={{ color: theme.textMuted, fontWeight: '700' }}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirm, { backgroundColor: theme.primary }]}
                onPress={handleSaveRename}
              >
                <Text style={{ color: '#FFF', fontWeight: '800' }}>SAVE CHANGES</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Video 3-Dots Actions Action Sheet Modal */}
      <Modal
        visible={videoActionsModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setVideoActionsModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setVideoActionsModalVisible(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={e => e.stopPropagation()}
            style={[styles.modalBox, { backgroundColor: theme.surface, borderColor: theme.border }]}
          >
            {/* Header with video info & close (X) button */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, marginRight: 8 }}>
                {selectedVideoForActions?.thumbnailPath || selectedVideoForActions?.uri ? (
                  <Image
                    source={{ uri: selectedVideoForActions.thumbnailPath || selectedVideoForActions.uri || selectedVideoForActions.storagePath }}
                    style={{ width: 44, height: 44, borderRadius: 10 }}
                  />
                ) : (
                  <View style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: theme.primaryGlow, justifyContent: 'center', alignItems: 'center' }}>
                    <Ionicons name="film" size={24} color={theme.primary} />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.text, fontWeight: '800', fontSize: 15 }} numberOfLines={1}>
                    {selectedVideoForActions?.name}
                  </Text>
                  <Text style={{ color: theme.textMuted, fontSize: 12 }} numberOfLines={1}>
                    {selectedVideoForActions ? (selectedVideoForActions.sizeBytes / (1024 * 1024)).toFixed(1) + ' MB • VIDEO' : ''}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setVideoActionsModalVisible(false)}
                style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: theme.card, justifyContent: 'center', alignItems: 'center' }}
              >
                <Ionicons name="close" size={18} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Actions List */}
            <TouchableOpacity
              style={styles.actionSheetRow}
              onPress={() => {
                const vid = selectedVideoForActions;
                setVideoActionsModalVisible(false);
                if (vid) openRenameVideoModal(vid);
              }}
            >
              <View style={[styles.actionIconBox, { backgroundColor: theme.primaryGlow }]}>
                <Ionicons name="pencil" size={18} color={theme.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.actionSheetText, { color: theme.text }]}>Edit Video Name</Text>
                <Text style={styles.actionSheetSub}>Rename video title</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.textSubtle} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionSheetRow}
              onPress={() => {
                const vid = selectedVideoForActions;
                setVideoActionsModalVisible(false);
                if (vid) openMoveVideoToFolderModal(vid);
              }}
            >
              <View style={[styles.actionIconBox, { backgroundColor: 'rgba(59,130,246,0.15)' }]}>
                <Ionicons name="folder" size={18} color="#3B82F6" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.actionSheetText, { color: theme.text }]}>Move to Folder</Text>
                <Text style={styles.actionSheetSub}>Organize into custom folders</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.textSubtle} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionSheetRow}
              onPress={() => {
                const vid = selectedVideoForActions;
                setVideoActionsModalVisible(false);
                if (vid) handleDeleteVideoWithConfirm(vid);
              }}
            >
              <View style={[styles.actionIconBox, { backgroundColor: 'rgba(239,68,68,0.15)' }]}>
                <Ionicons name="trash-outline" size={18} color={theme.danger} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.actionSheetText, { color: theme.danger }]}>Delete Video</Text>
                <Text style={styles.actionSheetSub}>Remove from library</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.textSubtle} />
            </TouchableOpacity>

            {/* Close Button */}
            <TouchableOpacity
              style={[styles.modalCancel, { marginTop: 10, alignItems: 'center' }]}
              onPress={() => setVideoActionsModalVisible(false)}
            >
              <Text style={{ color: theme.textMuted, fontWeight: '800' }}>CLOSE</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Edit / Rename Video Modal */}
      <Modal
        visible={renameVideoModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRenameVideoModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setRenameVideoModalVisible(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={e => e.stopPropagation()}
            style={[styles.modalBox, { backgroundColor: theme.surface, borderColor: theme.border }]}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={[styles.modalTitle, { color: theme.text, marginBottom: 0 }]}>
                RENAME VIDEO
              </Text>
              <TouchableOpacity onPress={() => setRenameVideoModalVisible(false)}>
                <Ionicons name="close" size={20} color={theme.textSubtle} />
              </TouchableOpacity>
            </View>

            <Text style={{ color: theme.textMuted, fontSize: 11, fontWeight: '700', marginBottom: 4 }}>
              VIDEO NAME
            </Text>
            <TextInput
              placeholder="Video Name"
              placeholderTextColor={theme.textSubtle}
              value={newVideoName}
              onChangeText={setNewVideoName}
              style={[
                styles.modalInput,
                { color: theme.text, backgroundColor: theme.card, borderColor: theme.border },
              ]}
              autoFocus
            />

            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setRenameVideoModalVisible(false)}
              >
                <Text style={{ color: theme.textMuted, fontWeight: '700' }}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirm, { backgroundColor: theme.primary }]}
                onPress={handleSaveVideoRename}
              >
                <Text style={{ color: '#FFF', fontWeight: '800' }}>SAVE CHANGES</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Move Video to Folder Modal */}
      <Modal
        visible={moveVideoToFolderModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMoveVideoToFolderModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setMoveVideoToFolderModalVisible(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={e => e.stopPropagation()}
            style={[styles.modalBox, { backgroundColor: theme.surface, borderColor: theme.border, maxHeight: '80%' }]}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={[styles.modalTitle, { color: theme.text, marginBottom: 0 }]}>
                MOVE VIDEO TO FOLDER
              </Text>
              <TouchableOpacity onPress={() => setMoveVideoToFolderModalVisible(false)}>
                <Ionicons name="close" size={20} color={theme.textSubtle} />
              </TouchableOpacity>
            </View>
            <Text style={{ color: theme.textMuted, fontSize: 12, marginBottom: 14 }}>
              {'Move "' + (selectedVideoForActions?.name || '') + '" into a folder:'}
            </Text>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 260 }}>
              {/* Option 1: Root */}
              <TouchableOpacity
                style={[styles.plSelectRow, { borderColor: theme.border, backgroundColor: theme.card }]}
                onPress={() => handleMoveVideoToFolder(null)}
                activeOpacity={0.7}
              >
                <View style={[styles.folderIconBadge, { backgroundColor: theme.primaryGlow }]}>
                  <Ionicons name="home-outline" size={20} color={theme.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.text, fontWeight: '700', fontSize: 14 }}>Root Library (No Folder)</Text>
                  <Text style={{ color: theme.textMuted, fontSize: 11 }}>Keep in main library</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={theme.textSubtle} />
              </TouchableOpacity>

              {/* Folders List with folder deletion button */}
              {folders.map(folder => {
                const count = files.filter(f => !f.isDeleted && f.folderId === folder.id).length;
                return (
                  <TouchableOpacity
                    key={folder.id}
                    style={[styles.plSelectRow, { borderColor: theme.border, backgroundColor: theme.card }]}
                    onPress={() => handleMoveVideoToFolder(folder.id)}
                    activeOpacity={0.7}
                  >
                    {folder.coverUri ? (
                      <Image source={{ uri: folder.coverUri }} style={{ width: 36, height: 36, borderRadius: 8, marginRight: 12 }} />
                    ) : (
                      <View style={[styles.folderIconBadge, { backgroundColor: folder.color + '25' }]}>
                        <Ionicons name="folder" size={20} color={folder.color} />
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: theme.text, fontWeight: '700', fontSize: 14 }}>{folder.name}</Text>
                      <Text style={{ color: theme.textMuted, fontSize: 11 }}>{count} items</Text>
                    </View>
                    <TouchableOpacity
                      style={{ padding: 8 }}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleChangeFolderCover(folder);
                      }}
                    >
                      <Ionicons name="camera-outline" size={17} color={theme.accent} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={{ padding: 8 }}
                      onPress={(e) => {
                        e.stopPropagation();
                        Alert.alert('Delete Folder', `Delete "${folder.name}"? Files will be kept in main library.`, [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Delete',
                            style: 'destructive',
                            onPress: async () => {
                              await deleteFolder(folder.id);
                              Alert.alert('Folder Deleted', `Folder "${folder.name}" has been deleted.`);
                            },
                          },
                        ]);
                      }}
                    >
                      <Ionicons name="trash-outline" size={17} color={theme.danger || '#EF4444'} />
                    </TouchableOpacity>
                    <Ionicons name="chevron-forward" size={16} color={theme.textSubtle} />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
              <TouchableOpacity
                style={[styles.modalConfirm, { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1, flex: 1, alignItems: 'center' }]}
                onPress={() => {
                  setMoveVideoToFolderModalVisible(false);
                  setNewFolderModalVisible(true);
                }}
              >
                <Text style={{ color: theme.primary, fontWeight: '800' }}>+ NEW FOLDER</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setMoveVideoToFolderModalVisible(false)}
              >
                <Text style={{ color: theme.textMuted, fontWeight: '700' }}>CANCEL</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Rename Playlist Modal */}
      <Modal
        visible={renamePlaylistModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRenamePlaylistModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setRenamePlaylistModalVisible(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={e => e.stopPropagation()}
            style={[styles.modalBox, { backgroundColor: theme.surface, borderColor: theme.border }]}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={[styles.modalTitle, { color: theme.text, marginBottom: 0 }]}>RENAME PLAYLIST</Text>
              <TouchableOpacity onPress={() => setRenamePlaylistModalVisible(false)}>
                <Ionicons name="close" size={20} color={theme.textSubtle} />
              </TouchableOpacity>
            </View>
            <TextInput
              placeholder="Playlist Name"
              placeholderTextColor={theme.textSubtle}
              value={newPlaylistRenameName}
              onChangeText={setNewPlaylistRenameName}
              style={[
                styles.modalInput,
                { color: theme.text, backgroundColor: theme.card, borderColor: theme.border },
              ]}
              autoFocus
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setRenamePlaylistModalVisible(false)}
              >
                <Text style={{ color: theme.textMuted, fontWeight: '700' }}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirm, { backgroundColor: theme.primary }]}
                onPress={handleSavePlaylistRename}
              >
                <Text style={{ color: '#FFF', fontWeight: '800' }}>SAVE</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Rename Folder Modal */}
      <Modal
        visible={renameFolderModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRenameFolderModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setRenameFolderModalVisible(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={e => e.stopPropagation()}
            style={[styles.modalBox, { backgroundColor: theme.surface, borderColor: theme.border }]}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={[styles.modalTitle, { color: theme.text, marginBottom: 0 }]}>RENAME FOLDER</Text>
              <TouchableOpacity onPress={() => setRenameFolderModalVisible(false)}>
                <Ionicons name="close" size={20} color={theme.textSubtle} />
              </TouchableOpacity>
            </View>
            <TextInput
              placeholder="Folder Name"
              placeholderTextColor={theme.textSubtle}
              value={newFolderRenameName}
              onChangeText={setNewFolderRenameName}
              style={[
                styles.modalInput,
                { color: theme.text, backgroundColor: theme.card, borderColor: theme.border },
              ]}
              autoFocus
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setRenameFolderModalVisible(false)}
              >
                <Text style={{ color: theme.textMuted, fontWeight: '700' }}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirm, { backgroundColor: theme.primary }]}
                onPress={handleSaveRenameFolder}
              >
                <Text style={{ color: '#FFF', fontWeight: '800' }}>SAVE</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* 1. AI Music Assistant Modal (Feature 1) */}
      <Modal
        visible={aiAssistantModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAiAssistantModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setAiAssistantModalVisible(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={e => e.stopPropagation()}
            style={[styles.modalBox, { backgroundColor: theme.surface, borderColor: theme.border }]}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="sparkles" size={18} color="#A855F7" />
                <Text style={[styles.modalTitle, { color: theme.text, marginBottom: 0 }]}>AI MUSIC ASSISTANT</Text>
              </View>
              <TouchableOpacity onPress={() => setAiAssistantModalVisible(false)}>
                <Ionicons name="close" size={20} color={theme.textSubtle} />
              </TouchableOpacity>
            </View>
            <Text style={{ fontSize: 11, color: theme.textMuted, marginBottom: 10 }}>
              Search music naturally by mood, feeling, or activity.
            </Text>

            <View style={{ position: 'relative', marginBottom: 12 }}>
              <TextInput
                placeholder="e.g. upbeat energetic workout, relaxing acoustic..."
                placeholderTextColor={theme.textSubtle}
                value={aiPromptText}
                onChangeText={setAiPromptText}
                style={[
                  styles.modalInput,
                  { color: theme.text, backgroundColor: theme.card, borderColor: theme.border, paddingRight: 36, marginBottom: 0 },
                ]}
              />
              {aiPromptText.length > 0 && (
                <TouchableOpacity
                  onPress={() => setAiPromptText('')}
                  style={{ position: 'absolute', right: 10, top: 12, padding: 4 }}
                >
                  <Ionicons name="close-circle" size={18} color={theme.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            <Text style={{ fontSize: 11, fontWeight: '800', color: theme.primary, marginBottom: 6 }}>
              CATEGORIZED MOODS & ACTIVITIES:
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
              {[
                { id: 'happy', label: '😊 Happy' },
                { id: 'workout', label: '⚡ Workout' },
                { id: 'relaxing', label: '🌿 Relaxing' },
                { id: 'devotional', label: '🙏 Devotional' },
                { id: 'focus', label: '🎯 Focus' },
                { id: 'sad', label: '🌧 Melancholy' },
                { id: 'party', label: '🎉 Party' },
              ].map(m => (
                <TouchableOpacity
                  key={m.id}
                  onPress={() => {
                    setSelectedMood(m.id);
                    setActiveTab('online');
                    setAiAssistantModalVisible(false);
                  }}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 7,
                    borderRadius: 14,
                    backgroundColor: selectedMood === m.id ? '#8B5CF6' : theme.card,
                    borderWidth: 1,
                    borderColor: selectedMood === m.id ? '#8B5CF6' : theme.border,
                  }}
                >
                  <Text style={{ fontSize: 11, color: selectedMood === m.id ? '#FFF' : theme.text, fontWeight: '700' }}>
                    {m.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setAiAssistantModalVisible(false)}
              >
                <Text style={{ color: theme.textMuted, fontWeight: '700' }}>CLOSE</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirm, { backgroundColor: '#A855F7' }]}
                onPress={() => {
                  if (aiPromptText.trim()) {
                    setOnlineSearchText(aiPromptText.trim());
                  }
                  setActiveTab('online');
                  setAiAssistantModalVisible(false);
                }}
              >
                <Text style={{ color: '#FFF', fontWeight: '800' }}>SEARCH WITH AI</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* 2. Cross-Device Sync Modal (Feature 3) */}
      <Modal
        visible={syncModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSyncModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setSyncModalVisible(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={e => e.stopPropagation()}
            style={[styles.modalBox, { backgroundColor: theme.surface, borderColor: theme.border }]}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="sync" size={18} color={theme.primary} />
                <Text style={[styles.modalTitle, { color: theme.text, marginBottom: 0 }]}>CROSS-DEVICE SYNC</Text>
              </View>
              <TouchableOpacity onPress={() => setSyncModalVisible(false)}>
                <Ionicons name="close" size={20} color={theme.textSubtle} />
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 11, color: theme.textMuted, marginBottom: 8 }}>
              Synchronize playlists and listening history seamlessly between Web Studio and Android.
            </Text>

            <Text style={{ fontSize: 11, fontWeight: '800', color: theme.primary, marginBottom: 4 }}>
              YOUR SYNC TOKEN (EXPORT):
            </Text>
            <TextInput
              value={syncExportToken}
              editable={false}
              multiline
              selectTextOnFocus
              style={[
                styles.modalInput,
                { color: theme.text, backgroundColor: theme.card, borderColor: theme.border, height: 60, fontSize: 10 },
              ]}
            />

            <Text style={{ fontSize: 11, fontWeight: '800', color: theme.textSubtle, marginTop: 8, marginBottom: 4 }}>
              RESTORE FROM TOKEN (IMPORT):
            </Text>
            <TextInput
              placeholder="Paste AK-SYNC token from Web Studio..."
              placeholderTextColor={theme.textSubtle}
              value={syncImportToken}
              onChangeText={setSyncImportToken}
              multiline
              style={[
                styles.modalInput,
                { color: theme.text, backgroundColor: theme.card, borderColor: theme.border, height: 60, fontSize: 10 },
              ]}
            />

            <View style={[styles.modalBtns, { marginTop: 14 }]}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setSyncModalVisible(false)}
              >
                <Text style={{ color: theme.textMuted, fontWeight: '700' }}>CLOSE</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirm, { backgroundColor: theme.primary }]}
                onPress={async () => {
                  if (!syncImportToken.trim()) {
                    Alert.alert('Empty Token', 'Please paste a valid AK-SYNC token.');
                    return;
                  }
                  const res = await importSyncToken(syncImportToken.trim());
                  if (res.success) {
                    Alert.alert(
                      'Sync Successful',
                      `Imported ${res.count} items (playlists & history)!`
                    );
                    setSyncModalVisible(false);
                    setSyncImportToken('');
                  } else {
                    Alert.alert('Sync Failed', res.error || 'Invalid token format');
                  }
                }}
              >
                <Text style={{ color: '#FFF', fontWeight: '800' }}>IMPORT & SYNC</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* 3. Voice Commands Modal (Feature 7) */}
      <Modal
        visible={voiceModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setVoiceModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setVoiceModalVisible(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={e => e.stopPropagation()}
            style={[styles.modalBox, { backgroundColor: theme.surface, borderColor: theme.border }]}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="mic" size={18} color="#EC4899" />
                <Text style={[styles.modalTitle, { color: theme.text, marginBottom: 0 }]}>VOICE COMMANDS</Text>
              </View>
              <TouchableOpacity onPress={() => setVoiceModalVisible(false)}>
                <Ionicons name="close" size={20} color={theme.textSubtle} />
              </TouchableOpacity>
            </View>

            <View style={{ alignItems: 'center', marginVertical: 12 }}>
              <View
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  backgroundColor: 'rgba(236, 72, 153, 0.15)',
                  justifyContent: 'center',
                  alignItems: 'center',
                  borderWidth: 2,
                  borderColor: '#EC4899',
                  marginBottom: 8,
                }}
              >
                <Ionicons name="mic" size={28} color="#EC4899" />
              </View>
              <Text style={{ fontSize: 12, fontWeight: '700', color: theme.text }}>
                {voiceStatusText}
              </Text>
            </View>

            <Text style={{ fontSize: 11, fontWeight: '800', color: theme.textSubtle, marginBottom: 6 }}>
              QUICK COMMANDS:
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
              {[
                { label: '▶ Play', cmd: 'play' },
                { label: '⏸ Pause', cmd: 'pause' },
                { label: '⏭ Next', cmd: 'next' },
                { label: '⏮ Prev', cmd: 'prev' },
                { label: '⚡ Workout', cmd: 'workout' },
                { label: '🙏 Devotional', cmd: 'devotional' },
                { label: '⏱ Sleep 30m', cmd: 'sleep timer' },
              ].map(c => (
                <TouchableOpacity
                  key={c.cmd}
                  onPress={() => handleExecuteVoiceCommand(c.cmd)}
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderRadius: 10,
                    backgroundColor: theme.card,
                    borderWidth: 1,
                    borderColor: theme.border,
                  }}
                >
                  <Text style={{ fontSize: 11, color: theme.text, fontWeight: '700' }}>{c.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              placeholder="Or type voice command manually..."
              placeholderTextColor={theme.textSubtle}
              value={voiceInputManual}
              onChangeText={setVoiceInputManual}
              style={[
                styles.modalInput,
                { color: theme.text, backgroundColor: theme.card, borderColor: theme.border, marginBottom: 12 },
              ]}
            />

            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setVoiceModalVisible(false)}
              >
                <Text style={{ color: theme.textMuted, fontWeight: '700' }}>CLOSE</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirm, { backgroundColor: '#EC4899' }]}
                onPress={() => {
                  if (voiceInputManual.trim()) {
                    handleExecuteVoiceCommand(voiceInputManual.trim());
                    setVoiceInputManual('');
                  }
                }}
              >
                <Text style={{ color: '#FFF', fontWeight: '800' }}>EXECUTE</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* 4. AI Playlist Generator Modal (Feature 10) */}
      <Modal
        visible={aiPlaylistModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAiPlaylistModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setAiPlaylistModalVisible(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={e => e.stopPropagation()}
            style={[styles.modalBox, { backgroundColor: theme.surface, borderColor: theme.border }]}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="sparkles" size={18} color="#A855F7" />
                <Text style={[styles.modalTitle, { color: theme.text, marginBottom: 0 }]}>AI PLAYLIST GENERATOR</Text>
              </View>
              <TouchableOpacity onPress={() => setAiPlaylistModalVisible(false)}>
                <Ionicons name="close" size={20} color={theme.textSubtle} />
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 11, color: theme.textMuted, marginBottom: 10 }}>
              Curate smart playlists dynamically based on mood, occasion, and activity.
            </Text>

            <TextInput
              placeholder={`Playlist Title (e.g. AI ${aiPlaylistMood} ${aiPlaylistActivity})`}
              placeholderTextColor={theme.textSubtle}
              value={aiPlaylistTitle}
              onChangeText={setAiPlaylistTitle}
              style={[
                styles.modalInput,
                { color: theme.text, backgroundColor: theme.card, borderColor: theme.border, marginBottom: 10 },
              ]}
            />

            <Text style={{ fontSize: 10, fontWeight: '800', color: theme.textSubtle, marginBottom: 4 }}>
              MOOD:
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
              {['Energetic', 'Chill', 'Focus', 'Party', 'Devotional', 'Romantic'].map(m => (
                <TouchableOpacity
                  key={m}
                  onPress={() => setAiPlaylistMood(m)}
                  style={{
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 10,
                    backgroundColor: aiPlaylistMood === m ? '#A855F7' : theme.card,
                    borderWidth: 1,
                    borderColor: aiPlaylistMood === m ? '#A855F7' : theme.border,
                  }}
                >
                  <Text style={{ fontSize: 10, color: aiPlaylistMood === m ? '#FFF' : theme.textMuted, fontWeight: '700' }}>
                    {m}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={{ fontSize: 10, fontWeight: '800', color: theme.textSubtle, marginBottom: 4 }}>
              ACTIVITY:
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
              {['Workout', 'Studying', 'Commute', 'Sleep', 'Celebration'].map(a => (
                <TouchableOpacity
                  key={a}
                  onPress={() => setAiPlaylistActivity(a)}
                  style={{
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 10,
                    backgroundColor: aiPlaylistActivity === a ? theme.primary : theme.card,
                    borderWidth: 1,
                    borderColor: aiPlaylistActivity === a ? theme.primary : theme.border,
                  }}
                >
                  <Text style={{ fontSize: 10, color: aiPlaylistActivity === a ? '#FFF' : theme.textMuted, fontWeight: '700' }}>
                    {a}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setAiPlaylistModalVisible(false)}
              >
                <Text style={{ color: theme.textMuted, fontWeight: '700' }}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirm, { backgroundColor: '#A855F7' }]}
                onPress={handleGenerateAiPlaylist}
              >
                <Text style={{ color: '#FFF', fontWeight: '800' }}>GENERATE</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Full-Screen Video & Media Viewer Modal */}
      <YouTubePlayerModal
        visible={ytPlayerVisible}
        onClose={() => setYtPlayerVisible(false)}
        track={selectedYtTrack}
        queue={onlineTracks}
        onTrackChange={handlePlayYouTubeTrack}
      />
      <MediaViewerModal file={viewerFile} onClose={() => setViewerFile(null)} />

      {/* Full-Screen Features & Settings Sheet */}
      <Modal
        visible={featuresOpen}
        transparent={false}
        animationType="slide"
        onRequestClose={() => setFeaturesOpen(false)}
      >
        <View style={[styles.container, { backgroundColor: theme.background }]}>
          {/* Header */}
          <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 54, paddingBottom: 14 }]}>
            <TouchableOpacity onPress={() => setFeaturesOpen(false)}>
              <Ionicons name="chevron-down" size={26} color={theme.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: theme.text }]}>AK AUDIO</Text>
            <View style={{ width: 26 }} />
          </View>

          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
            {/* AI Music Assistant */}
            <TouchableOpacity
              style={[styles.featureCard, { backgroundColor: theme.card, borderColor: theme.border }]}
              onPress={() => { setFeaturesOpen(false); setAiAssistantModalVisible(true); }}
              activeOpacity={0.8}
            >
              <View style={[styles.featureIconCircle, { backgroundColor: 'rgba(168, 85, 247, 0.15)' }]}>
                <Ionicons name="sparkles" size={24} color="#A855F7" />
              </View>
              <Text style={[styles.featureTitle, { color: theme.text }]}>AI Music Assistant</Text>
              <Text style={[styles.featureSub, { color: theme.textSubtle }]}>Smart recommendations & mood discovery</Text>
            </TouchableOpacity>

            {/* Cross-Device Sync */}
            <TouchableOpacity
              style={[styles.featureCard, { backgroundColor: theme.card, borderColor: theme.border }]}
              onPress={() => { setFeaturesOpen(false); setSyncModalVisible(true); }}
              activeOpacity={0.8}
            >
              <View style={[styles.featureIconCircle, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
                <Ionicons name="sync" size={24} color="#3B82F6" />
              </View>
              <Text style={[styles.featureTitle, { color: theme.text }]}>Cross-Device Sync</Text>
              <Text style={[styles.featureSub, { color: theme.textSubtle }]}>Sync across Web & Android</Text>
            </TouchableOpacity>

            {/* Sleep Timer */}
            <TouchableOpacity
              style={[styles.featureCard, { backgroundColor: theme.card, borderColor: theme.border }]}
              onPress={() => { setFeaturesOpen(false); setExpandedNowPlaying(true); }}
              activeOpacity={0.8}
            >
              <View style={[styles.featureIconCircle, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                <Ionicons name="moon" size={24} color="#10B981" />
              </View>
              <Text style={[styles.featureTitle, { color: theme.text }]}>Sleep Timer</Text>
              <Text style={[styles.featureSub, { color: theme.textSubtle }]}>Auto-stop playback</Text>
            </TouchableOpacity>

            {/* Equalizer */}
            <TouchableOpacity
              style={[styles.featureCard, { backgroundColor: theme.card, borderColor: theme.border }]}
              onPress={() => { setFeaturesOpen(false); setExpandedNowPlaying(true); }}
              activeOpacity={0.8}
            >
              <View style={[styles.featureIconCircle, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                <Ionicons name="options-outline" size={24} color="#F59E0B" />
              </View>
              <Text style={[styles.featureTitle, { color: theme.text }]}>Equalizer</Text>
              <Text style={[styles.featureSub, { color: theme.textSubtle }]}>Advanced 3-band EQ</Text>
            </TouchableOpacity>

            {/* Voice Commands */}
            <TouchableOpacity
              style={[styles.featureCard, { backgroundColor: theme.card, borderColor: theme.border }]}
              onPress={() => { setFeaturesOpen(false); setVoiceModalVisible(true); }}
              activeOpacity={0.8}
            >
              <View style={[styles.featureIconCircle, { backgroundColor: 'rgba(236, 72, 153, 0.15)' }]}>
                <Ionicons name="mic" size={24} color="#EC4899" />
              </View>
              <Text style={[styles.featureTitle, { color: theme.text }]}>Voice Commands</Text>
              <Text style={[styles.featureSub, { color: theme.textSubtle }]}>Control with voice</Text>
            </TouchableOpacity>

            {/* AI Playlist Generator */}
            <TouchableOpacity
              style={[styles.featureCard, { backgroundColor: theme.card, borderColor: theme.border }]}
              onPress={() => { setFeaturesOpen(false); setAiPlaylistModalVisible(true); }}
              activeOpacity={0.8}
            >
              <View style={[styles.featureIconCircle, { backgroundColor: 'rgba(124, 58, 237, 0.15)' }]}>
                <Ionicons name="albums" size={24} color="#7C3AED" />
              </View>
              <Text style={[styles.featureTitle, { color: theme.text }]}>AI Playlist Generator</Text>
              <Text style={[styles.featureSub, { color: theme.textSubtle }]}>Create from moods</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  addMusicHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  addMusicBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '800',
  },
  addTrackSmallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  addTrackSmallText: {
    fontSize: 11,
    fontWeight: '700',
  },
  container: {
    flex: 1,
    ...(Platform.OS === 'web' ? { maxWidth: 720, width: '100%', alignSelf: 'center' } : {}),
  },
  header: {
    paddingTop: 54,
    paddingHorizontal: 16,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  headerTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  headerBtns: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  actionBtnText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  iconActionBtn: {
    padding: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 24,
  },
  tabItem: {
    paddingBottom: 10,
    borderBottomWidth: 3,
  },
  tabLabel: {
    fontSize: 13,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 110,
  },
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 20,
    borderWidth: 1.5,
    marginBottom: 20,
  },
  heroMetaArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  heroArtwork: {
    width: 68,
    height: 68,
    borderRadius: 14,
  },
  heroMeta: {
    flex: 1,
    marginLeft: 14,
    marginRight: 8,
  },
  playingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  playingBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  heroTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  heroArtist: {
    fontSize: 12,
    marginTop: 2,
  },
  microVisualizer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
    height: 16,
    marginTop: 6,
  },
  heroBar: {
    width: 3,
    borderRadius: 2,
  },
  heroPlayBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeadingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  clearBtnText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  trackContentArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  trackPlayBtn: {
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trackThumb: {
    width: 44,
    height: 44,
    borderRadius: 10,
  },
  trackMeta: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  liveTrackWave: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
    height: 16,
  },
  inlineWaveBar: {
    width: 3,
    borderRadius: 1.5,
  },
  trackTitle: {
    fontSize: 13,
    fontWeight: '800',
    fontFamily: Platform.select({ android: 'sans-serif-medium', ios: 'System' }),
  },
  trackArtist: {
    fontSize: 11,
    marginTop: 2,
    fontFamily: Platform.select({ android: 'sans-serif', ios: 'System' }),
  },
  playlistGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  plCard: {
    width: (SCREEN_WIDTH - 44) / 2,
    padding: 10,
    borderRadius: 16,
    borderWidth: 1,
  },
  plCoverWrapper: {
    position: 'relative',
    width: '100%',
    height: 120,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 8,
  },
  plCover: {
    width: '100%',
    height: '100%',
  },
  plDeleteBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  plTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  plSub: {
    fontSize: 11,
    marginTop: 2,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalBox: {
    width: '100%',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 16,
    letterSpacing: 1,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    marginBottom: 12,
  },
  modalBtns: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 6,
  },
  modalCancel: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  modalConfirm: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  plSelectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    gap: 12,
  },
  plSelectThumb: {
    width: 42,
    height: 42,
    borderRadius: 8,
  },
  folderIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  videoCard: {
    width: (SCREEN_WIDTH - 50) / 2,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 14,
  },
  videoThumbWrapper: {
    width: '100%',
    height: 144,
    position: 'relative',
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoThumb: {
    width: '100%',
    height: '100%',
  },
  videoPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoPlayOverlay: {
    position: 'absolute',
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoDurationBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  videoDurationText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
  },
  videoCardMeta: {
    padding: 10,
  },
  videoCardTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  videoCardSub: {
    fontSize: 10,
    marginTop: 2,
  },
  actionSheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    gap: 12,
    marginBottom: 4,
  },
  actionIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionSheetText: {
    fontSize: 14,
    fontWeight: '700',
  },
  actionSheetSub: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 12,
  },
  featureIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  featureSub: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },

  // Online Music Tab Styles
  onlineSearchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  onlineSearchInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    paddingVertical: 6,
  },
  onlineSearchSubmitBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  onlineSearchSubmitText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '800',
  },
  categoryChipsScroll: {
    gap: 8,
    paddingBottom: 14,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  viewModeBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  onlineLoadingBox: {
    paddingVertical: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  onlineLoadingText: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 10,
  },
  onlineGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  onlineGridCard: {
    width: (SCREEN_WIDTH - 44) / 2,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  onlineThumbBox: {
    width: '100%',
    height: ((SCREEN_WIDTH - 44) / 2) * (9 / 16),
    position: 'relative',
    backgroundColor: '#000',
  },
  onlineGridThumb: {
    width: '100%',
    height: '100%',
  },
  onlinePlayOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  onlinePlayIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  onlineDurationBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  onlineDurationText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
  },
  onlineGridBody: {
    padding: 10,
  },
  onlineGridTitle: {
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
    minHeight: 32,
  },
  onlineGridArtist: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 3,
  },
  onlineGridFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  onlineViewsText: {
    fontSize: 10,
    fontWeight: '600',
  },
  onlineAddPlBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  onlineListCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  onlineListThumbWrapper: {
    width: 96,
    height: 54,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#000',
  },
  onlineListThumb: {
    width: '100%',
    height: '100%',
  },
  onlineListDurationBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  onlineListMeta: {
    flex: 1,
  },
  onlineListTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  onlineListArtist: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
});
