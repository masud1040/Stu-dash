import { saveCloudData } from './dbSync';
import { User } from '../../App';

export interface SectionMeta {
  key: string;
  name: string;
  category: 'Study & Tasks' | 'Learning Tools' | 'Career & Documents' | 'Preferences & Security';
  description: string;
  icon: string;
  badgeColor: string;
  isArray: boolean;
  idField?: string;
  textField?: string;
}

export const WEBSITE_SECTIONS: SectionMeta[] = [
  {
    key: 'todos',
    name: 'Todos & Tasks',
    category: 'Study & Tasks',
    description: 'To-do items, priorities, deadlines, and completion statuses',
    icon: 'fa-list-check',
    badgeColor: 'bg-emerald-500',
    isArray: true,
    idField: 'id',
    textField: 'text'
  },
  {
    key: 'notes',
    name: 'Notes & Documents',
    category: 'Learning Tools',
    description: 'Rich-text A4 notes, categories, word counts, and study guides',
    icon: 'fa-book-open',
    badgeColor: 'bg-indigo-500',
    isArray: true,
    idField: 'id',
    textField: 'title'
  },
  {
    key: 'habits',
    name: 'Habit Tracker',
    category: 'Study & Tasks',
    description: 'Daily habits, active streaks, and completion logs',
    icon: 'fa-fire',
    badgeColor: 'bg-amber-500',
    isArray: true,
    idField: 'id',
    textField: 'name'
  },
  {
    key: 'subjects',
    name: 'Subjects & Courses',
    category: 'Study & Tasks',
    description: 'Academic subjects, course colors, and target study hours',
    icon: 'fa-graduation-cap',
    badgeColor: 'bg-blue-500',
    isArray: true,
    idField: 'id',
    textField: 'name'
  },
  {
    key: 'study_sessions',
    name: 'Study Sessions',
    category: 'Study & Tasks',
    description: 'Logged study sessions, durations, and subject associations',
    icon: 'fa-clock-rotate-left',
    badgeColor: 'bg-violet-500',
    isArray: true,
    idField: 'id'
  },
  {
    key: 'study_assignments',
    name: 'Assignments & Deadlines',
    category: 'Study & Tasks',
    description: 'Course assignments, submission deadlines, and topics',
    icon: 'fa-clipboard-check',
    badgeColor: 'bg-rose-500',
    isArray: true,
    idField: 'id',
    textField: 'topic'
  },
  {
    key: 'resources',
    name: 'Resources & Bookmarks',
    category: 'Learning Tools',
    description: 'Study links, PDFs, videos, websites, and favorite materials',
    icon: 'fa-folder-open',
    badgeColor: 'bg-teal-500',
    isArray: true,
    idField: 'id',
    textField: 'title'
  },
  {
    key: 'meetings',
    name: 'Meetings & Events',
    category: 'Study & Tasks',
    description: 'Study group meetings, exam schedules, and classes',
    icon: 'fa-calendar-days',
    badgeColor: 'bg-sky-500',
    isArray: true,
    idField: 'id',
    textField: 'title'
  },
  {
    key: 'interview_questions',
    name: 'Interview Questions',
    category: 'Career & Documents',
    description: 'Technical and behavioral interview questions and answers',
    icon: 'fa-user-tie',
    badgeColor: 'bg-fuchsia-500',
    isArray: true,
    idField: 'id',
    textField: 'question'
  },
  {
    key: 'interview_tags',
    name: 'Interview Tags',
    category: 'Career & Documents',
    description: 'Custom topic tags for interview preparation',
    icon: 'fa-tags',
    badgeColor: 'bg-purple-500',
    isArray: true
  },
  {
    key: 'mock_interview_history',
    name: 'Mock Interview History',
    category: 'Career & Documents',
    description: 'Saved mock interview sessions, transcripts, AI scores, and feedback reports',
    icon: 'fa-user-tie',
    badgeColor: 'bg-violet-600',
    isArray: true,
    idField: 'id',
    textField: 'topic'
  },
  {
    key: 'class_routine',
    name: 'Class Routine',
    category: 'Study & Tasks',
    description: 'Visual weekly timetable image or routine document',
    icon: 'fa-table',
    badgeColor: 'bg-cyan-500',
    isArray: false
  },
  {
    key: 'student_cv',
    name: 'Student CV & Resume',
    category: 'Career & Documents',
    description: 'Stored resume information and uploaded PDF file',
    icon: 'fa-file-pdf',
    badgeColor: 'bg-red-500',
    isArray: false
  },
  {
    key: 'study_roadmap_milestones',
    name: 'Study Roadmap',
    category: 'Learning Tools',
    description: 'Semester learning milestones and study roadmap stages',
    icon: 'fa-route',
    badgeColor: 'bg-emerald-600',
    isArray: true,
    idField: 'id',
    textField: 'title'
  },
  {
    key: 'passwords_list',
    name: 'Password Vault',
    category: 'Preferences & Security',
    description: 'Encrypted passwords, academic portal logins, and usernames',
    icon: 'fa-key',
    badgeColor: 'bg-orange-500',
    isArray: true,
    idField: 'id',
    textField: 'title'
  },
  {
    key: 'student_user',
    name: 'Student Profile',
    category: 'Preferences & Security',
    description: 'Personal profile, name, avatar, university, and bio',
    icon: 'fa-user',
    badgeColor: 'bg-indigo-600',
    isArray: false
  },
  {
    key: 'focus_timer_settings',
    name: 'Focus Timer Settings',
    category: 'Preferences & Security',
    description: 'Duration presets, current focus tags, and progress ring color themes',
    icon: 'fa-stopwatch',
    badgeColor: 'bg-pink-500',
    isArray: false
  },
  {
    key: 'notification_settings',
    name: 'Notification Settings',
    category: 'Preferences & Security',
    description: 'Monthly reports, in-app notification preferences, and deadlines',
    icon: 'fa-bell',
    badgeColor: 'bg-amber-600',
    isArray: false
  }
];

export interface BackupPayload {
  app: string;
  version: string;
  exportedAt: string;
  userEmail?: string;
  totalSections: number;
  totalItems: number;
  sections: Record<string, any>;
  [key: string]: any;
}

export interface DetectedSection {
  key: string;
  name: string;
  category: string;
  icon: string;
  badgeColor: string;
  itemCount: number;
  isArray: boolean;
  data: any;
}

export interface ParseResult {
  valid: boolean;
  error?: string;
  metadata?: {
    app?: string;
    version?: string;
    exportedAt?: string;
    userEmail?: string;
  };
  detectedSections: DetectedSection[];
  rawPayload: any;
}

/**
 * Reads data for a section from localStorage
 */
export function getSectionLocalData(sectionKey: string): any {
  if (sectionKey === 'focus_timer_settings') {
    return {
      duration: localStorage.getItem('global_timer_duration') || '25',
      tag: localStorage.getItem('global_timer_tag') || 'Study',
      tagColors: localStorage.getItem('global_timer_tag_colors') 
        ? JSON.parse(localStorage.getItem('global_timer_tag_colors') || '{}') 
        : null,
      color: localStorage.getItem('global_timer_color') || 'indigo'
    };
  }

  const raw = localStorage.getItem(sectionKey);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

/**
 * Computes live count of items in a section
 */
export function getSectionItemCount(sectionKey: string): number {
  const data = getSectionLocalData(sectionKey);
  if (!data) return 0;
  if (Array.isArray(data)) return data.length;
  if (typeof data === 'object') {
    return Object.keys(data).length > 0 ? 1 : 0;
  }
  if (typeof data === 'string' && data.trim()) return 1;
  return 0;
}

/**
 * Exports full website data as a downloaded JSON file
 */
export function exportFullWebsiteJSON(
  userEmail?: string, 
  selectedSectionKeys?: string[]
): { success: boolean; totalSections: number; totalItems: number; filename: string } {
  const keysToExport = selectedSectionKeys && selectedSectionKeys.length > 0
    ? selectedSectionKeys
    : WEBSITE_SECTIONS.map(s => s.key);

  const sectionsData: Record<string, any> = {};
  let totalItemsCount = 0;
  let exportedSectionCount = 0;

  for (const key of keysToExport) {
    const data = getSectionLocalData(key);
    if (data !== null && data !== undefined) {
      sectionsData[key] = data;
      exportedSectionCount++;
      if (Array.isArray(data)) {
        totalItemsCount += data.length;
      } else if (data) {
        totalItemsCount += 1;
      }
    }
  }

  const payload: BackupPayload = {
    app: 'StudyDash',
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    userEmail: userEmail || 'guest@studydash.com',
    totalSections: exportedSectionCount,
    totalItems: totalItemsCount,
    sections: sectionsData,
    ...sectionsData // Also expose flat at root for seamless third-party compatibility
  };

  const jsonString = JSON.stringify(payload, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
  const filename = `studydash_full_backup_${dateStr}_${timeStr}.json`;

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return {
    success: true,
    totalSections: exportedSectionCount,
    totalItems: totalItemsCount,
    filename
  };
}

/**
 * Parses and validates an uploaded JSON backup file
 */
export function parseBackupFile(jsonString: string): ParseResult {
  let parsed: any;
  try {
    parsed = JSON.parse(jsonString);
  } catch (err: any) {
    return {
      valid: false,
      error: `Invalid JSON format: ${err?.message || 'Syntax error'}. Please upload a valid .json file.`,
      detectedSections: [],
      rawPayload: null
    };
  }

  if (!parsed || typeof parsed !== 'object') {
    return {
      valid: false,
      error: 'The uploaded file does not contain a valid JSON object.',
      detectedSections: [],
      rawPayload: null
    };
  }

  // Find where section data is located: could be in `sections`, `data`, or directly on root
  const rootObj = parsed;
  const sectionsBag = rootObj.sections || rootObj.data || {};

  const detectedSections: DetectedSection[] = [];

  for (const meta of WEBSITE_SECTIONS) {
    let sectionData = sectionsBag[meta.key];
    if (sectionData === undefined && rootObj[meta.key] !== undefined) {
      sectionData = rootObj[meta.key];
    }

    // Flexible alias matching (e.g. "tasks" for "todos", "sessions" for "study_sessions")
    if (sectionData === undefined) {
      if (meta.key === 'todos') sectionData = sectionsBag.tasks || rootObj.tasks;
      else if (meta.key === 'study_sessions') sectionData = sectionsBag.sessions || rootObj.sessions;
      else if (meta.key === 'study_assignments') sectionData = sectionsBag.assignments || rootObj.assignments;
      else if (meta.key === 'passwords_list') sectionData = sectionsBag.passwords || rootObj.passwords;
      else if (meta.key === 'student_user') sectionData = sectionsBag.user || rootObj.user || sectionsBag.profile || rootObj.profile;
      else if (meta.key === 'focus_timer_settings') sectionData = sectionsBag.timer || rootObj.timer || sectionsBag.timer_settings || rootObj.timer_settings;
    }

    if (sectionData !== undefined && sectionData !== null) {
      let count = 0;
      if (Array.isArray(sectionData)) {
        count = sectionData.length;
      } else if (typeof sectionData === 'object') {
        count = Object.keys(sectionData).length > 0 ? 1 : 0;
      } else if (typeof sectionData === 'string' && sectionData.trim()) {
        count = 1;
      }

      detectedSections.push({
        key: meta.key,
        name: meta.name,
        category: meta.category,
        icon: meta.icon,
        badgeColor: meta.badgeColor,
        itemCount: count,
        isArray: Array.isArray(sectionData),
        data: sectionData
      });
    }
  }

  if (detectedSections.length === 0) {
    return {
      valid: false,
      error: 'No recognized StudyDash sections found in this JSON file. Expected sections such as todos, notes, habits, subjects, resources, etc.',
      detectedSections: [],
      rawPayload: parsed
    };
  }

  return {
    valid: true,
    metadata: {
      app: parsed.app,
      version: parsed.version,
      exportedAt: parsed.exportedAt,
      userEmail: parsed.userEmail
    },
    detectedSections,
    rawPayload: parsed
  };
}

export interface ImportResult {
  success: boolean;
  totalSectionsUpdated: number;
  totalItemsContributed: number;
  details: Array<{
    key: string;
    name: string;
    addedCount: number;
    totalCount: number;
  }>;
}

/**
 * Imports and contributes section data into localStorage and Firestore
 */
export async function importSectionData(
  detectedSections: DetectedSection[],
  selectedSectionKeys: string[],
  mode: 'merge' | 'overwrite',
  userEmail?: string,
  onUserUpdate?: (updatedUser: User) => void
): Promise<ImportResult> {
  const details: Array<{ key: string; name: string; addedCount: number; totalCount: number }> = [];
  let totalSectionsUpdated = 0;
  let totalItemsContributed = 0;

  for (const section of detectedSections) {
    if (!selectedSectionKeys.includes(section.key)) continue;

    const currentData = getSectionLocalData(section.key);
    const incomingData = section.data;

    let finalData: any = incomingData;
    let addedCount = 0;
    let totalCount = 0;

    if (section.key === 'focus_timer_settings') {
      // Special handler for focus timer
      if (typeof incomingData === 'object' && incomingData !== null) {
        if (incomingData.duration) {
          localStorage.setItem('global_timer_duration', String(incomingData.duration));
        }
        if (incomingData.tag) {
          localStorage.setItem('global_timer_tag', String(incomingData.tag));
        }
        if (incomingData.tagColors) {
          const existingColors = currentData?.tagColors || {};
          const mergedColors = mode === 'merge' ? { ...existingColors, ...incomingData.tagColors } : incomingData.tagColors;
          localStorage.setItem('global_timer_tag_colors', JSON.stringify(mergedColors));
        }
        if (incomingData.color) {
          localStorage.setItem('global_timer_color', String(incomingData.color));
        }
        addedCount = 1;
        totalCount = 1;
      }
    } else if (section.key === 'student_user') {
      // Profile handler
      if (typeof incomingData === 'object' && incomingData !== null) {
        if (mode === 'merge' && currentData && typeof currentData === 'object') {
          finalData = { ...currentData, ...incomingData };
        } else {
          finalData = incomingData;
        }
        localStorage.setItem('student_user', JSON.stringify(finalData));
        if (onUserUpdate) {
          onUserUpdate(finalData);
        }
        addedCount = 1;
        totalCount = 1;
      }
    } else if (Array.isArray(incomingData)) {
      if (mode === 'merge' && Array.isArray(currentData)) {
        // Intelligent array deduplication & merge
        const existingMap = new Map<string, any>();
        for (const item of currentData) {
          const id = item.id || item._id || JSON.stringify(item);
          existingMap.set(String(id), item);
        }

        const newItems: any[] = [];
        for (const incomingItem of incomingData) {
          if (!incomingItem || typeof incomingItem !== 'object') {
            if (!currentData.includes(incomingItem)) {
              newItems.push(incomingItem);
            }
            continue;
          }

          const incId = incomingItem.id || incomingItem._id;
          if (incId && existingMap.has(String(incId))) {
            // Item exists with same ID: update if newer or keep
            existingMap.set(String(incId), { ...existingMap.get(String(incId)), ...incomingItem });
          } else {
            // Check for text/title duplicate to avoid double-logging identical entries
            const meta = WEBSITE_SECTIONS.find(s => s.key === section.key);
            const checkField = meta?.textField;
            const duplicateByText = checkField && incomingItem[checkField] 
              ? currentData.some(e => e[checkField]?.toLowerCase?.() === incomingItem[checkField]?.toLowerCase?.())
              : false;

            if (!duplicateByText) {
              const safeItem = {
                ...incomingItem,
                id: incomingItem.id || `imp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
              };
              newItems.push(safeItem);
              existingMap.set(String(safeItem.id), safeItem);
            }
          }
        }

        finalData = Array.from(existingMap.values());
        addedCount = newItems.length;
        totalCount = finalData.length;
      } else {
        finalData = incomingData;
        addedCount = incomingData.length;
        totalCount = incomingData.length;
      }

      localStorage.setItem(section.key, JSON.stringify(finalData));
    } else if (typeof incomingData === 'object' && incomingData !== null) {
      if (mode === 'merge' && currentData && typeof currentData === 'object') {
        finalData = { ...currentData, ...incomingData };
      } else {
        finalData = incomingData;
      }
      localStorage.setItem(section.key, JSON.stringify(finalData));
      addedCount = 1;
      totalCount = 1;
    } else {
      // Primitive value (e.g. class_routine string)
      finalData = incomingData;
      localStorage.setItem(section.key, typeof incomingData === 'string' ? incomingData : JSON.stringify(incomingData));
      addedCount = 1;
      totalCount = 1;
    }

    // Persist to Firestore if user email is present
    if (userEmail && userEmail !== 'guest' && userEmail !== 'guest@studydash.com') {
      try {
        await saveCloudData(userEmail, section.key, finalData);
      } catch (err) {
        console.warn(`Error cloud-syncing imported section ${section.key}:`, err);
      }
    }

    totalSectionsUpdated++;
    totalItemsContributed += addedCount;
    details.push({
      key: section.key,
      name: section.name,
      addedCount,
      totalCount
    });
  }

  // Trigger universal storage event to refresh all components across pages immediately
  window.dispatchEvent(new Event('storage'));

  return {
    success: true,
    totalSectionsUpdated,
    totalItemsContributed,
    details
  };
}

/**
 * Creates a sample starter template JSON for users to understand the schema
 */
export function generateSampleTemplateJSON(): string {
  const sample = {
    app: 'StudyDash',
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    description: 'Sample JSON import template for StudyDash. You can add your own items under each section.',
    sections: {
      todos: [
        {
          id: 'todo-sample-1',
          text: 'Complete Chemistry Chapter 4 Practice Problems',
          priority: 'high',
          dueDate: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
          completed: false,
          createdDate: new Date().toISOString().split('T')[0]
        }
      ],
      notes: [
        {
          id: 'note-sample-1',
          title: 'Algorithms & Data Structures Summary',
          content: '<p>Key principles of binary search trees and recursion...</p>',
          date: new Date().toISOString().split('T')[0],
          category: 'Computer Science',
          wordCount: 120
        }
      ],
      habits: [
        {
          id: 'habit-sample-1',
          name: 'Morning Math Problem Solving',
          icon: 'fa-brain',
          color: 'bg-indigo-500',
          streak: 5,
          completedDates: [new Date().toISOString().split('T')[0]]
        }
      ],
      subjects: [
        {
          id: 'sub-sample-1',
          name: 'Advanced Mathematics',
          color: 'bg-blue-500',
          targetHours: 15
        }
      ],
      resources: [
        {
          id: 'res-sample-1',
          title: 'Khan Academy Linear Algebra',
          description: 'Comprehensive tutorials on matrices and vectors',
          type: 'website',
          content: 'https://www.khanacademy.org',
          tags: ['Math', 'Algebra'],
          dateAdded: new Date().toISOString().split('T')[0],
          bookmarked: true
        }
      ],
      interview_questions: [
        {
          id: 'q-sample-1',
          question: 'What is the time complexity of QuickSort?',
          answer: 'Average case is O(n log n), worst case is O(n^2) when pivot selection is poor.',
          tag: 'Data Structures',
          favorite: true,
          createdAt: new Date().toLocaleDateString('en-US'),
          updatedAt: new Date().toLocaleDateString('en-US')
        }
      ]
    }
  };
  return JSON.stringify(sample, null, 2);
}
