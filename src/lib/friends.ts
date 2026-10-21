export interface Friend {
  id: string;
  username: string;
  userTag: string;
  avatar?: string;
  rating: number;
  status: 'online' | 'offline' | string;
  country?: string;
}

const DEFAULT_FRIENDS: Friend[] = [
  {
    id: 'f1',
    username: 'MACHT_005',
    userTag: '#476M',
    rating: 476,
    status: 'online',
    country: '🇮🇳',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=macht',
  },
  {
    id: 'f2',
    username: 'tulasivardhan54',
    userTag: '#512T',
    rating: 512,
    status: 'Online 1 day ago',
    country: '🇮🇳',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=tulasi',
  },
];

const STORAGE_KEY = 'chess_friends_list';

export function getFriends(): Friend[] {
  if (typeof window === 'undefined') return DEFAULT_FRIENDS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_FRIENDS));
      return DEFAULT_FRIENDS;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_FRIENDS;
  }
}

export function addFriend(username: string): Friend {
  const current = getFriends();
  const trimmed = username.trim();
  const id = `f_${Date.now()}`;
  const newFriend: Friend = {
    id,
    username: trimmed,
    userTag: `#${id.slice(-4).toUpperCase()}`,
    rating: Math.floor(350 + Math.random() * 450),
    status: 'online',
    country: '🌐',
    avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${trimmed}`,
  };
  const updated = [newFriend, ...current];
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }
  return newFriend;
}

export function removeFriend(id: string): void {
  const current = getFriends().filter(f => f.id !== id);
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  }
}
