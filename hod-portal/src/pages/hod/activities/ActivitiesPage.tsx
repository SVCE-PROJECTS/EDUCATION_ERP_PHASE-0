import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Cpu, Trophy, Music2, Zap, ChevronRight } from '../../../components/icons';
import ScreenWrapper from '../../../layouts/ScreenWrapper';
import { colors, shadows, primaryScale, neutral } from '../../../theme/colors';
import { ROUTES } from '../../../navigation/routes';

// Sub-page imports
import RealTimeIndustryProjects from './RealTimeIndustryProjects';
import Hackathons from './Hackathons';
import Sports from './Sports';
import OtherCurricularActivities from './OtherCurricularActivities';

type ViewId = 'tech-menu' | 'nontech-menu' | 'industry-projects' | 'hackathons' | 'sports' | 'other-curricular';

// ── Navigation tree ───────────────────────────────────────────────────────────
const VIEW_COMPONENTS: Partial<Record<ViewId, React.ComponentType>> = {
  'industry-projects': RealTimeIndustryProjects,
  hackathons: Hackathons,
  sports: Sports,
  'other-curricular': OtherCurricularActivities,
};

interface CardDef {
  id: ViewId;
  label: string;
  description: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
  gradient: [string, string];
  badge?: string;
}

const TOP_CARDS: CardDef[] = [
  {
    id: 'tech-menu',
    label: 'Technical Activities',
    description: 'Real-time industry projects and hackathon participation records.',
    icon: Cpu,
    gradient: [primaryScale[500], colors.blue[600]],
    badge: '2 categories',
  },
  {
    id: 'nontech-menu',
    label: 'Non-Technical Activities',
    description: 'Sports achievements and other curricular event participations.',
    icon: Trophy,
    gradient: [colors.emerald[500], colors.teal[600]],
    badge: '2 categories',
  },
];

const TECH_CARDS: CardDef[] = [
  {
    id: 'industry-projects',
    label: 'Real-Time Industry Projects',
    description: 'Live and completed student industry projects with team members.',
    icon: Zap,
    gradient: [colors.violet[500], primaryScale[600]],
  },
  {
    id: 'hackathons',
    label: 'Hackathons',
    description: 'Student hackathon participations, positions, and achievements.',
    icon: Cpu,
    gradient: [colors.blue[500], colors.cyan[600]],
  },
];

const NON_TECH_CARDS: CardDef[] = [
  {
    id: 'sports',
    label: 'Sports',
    description: 'District, state, and national level sports achievements.',
    icon: Trophy,
    gradient: [colors.orange[500], colors.amber[600]],
  },
  {
    id: 'other-curricular',
    label: 'Other Curricular Activities',
    description: 'Cultural events, competitions, and co-curricular participations.',
    icon: Music2,
    gradient: [colors.pink[500], colors.rose[600]],
  },
];

// ── Breadcrumb ────────────────────────────────────────────────────────────────

interface BreadcrumbItem {
  label: string;
  onPress?: () => void;
}

function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <View style={s.breadcrumb}>
      {items.map((item, i) => (
        <View key={i} style={s.breadcrumbItem}>
          {i > 0 && <ChevronRight size={13} color={neutral[300]} />}
          {item.onPress ? (
            <TouchableOpacity onPress={item.onPress}>
              <Text style={s.breadcrumbLink}>{item.label}</Text>
            </TouchableOpacity>
          ) : (
            <Text style={s.breadcrumbCurrent}>{item.label}</Text>
          )}
        </View>
      ))}
    </View>
  );
}

// ── Selection card ────────────────────────────────────────────────────────────

function SelectCard({ card, onPress }: { card: CardDef; onPress: () => void }) {
  const Icon = card.icon;
  return (
    <TouchableOpacity style={s.selectCard} onPress={onPress} activeOpacity={0.85}>
      <View style={s.selectCardLeft}>
        <View style={[s.selectIcon, { backgroundColor: card.gradient[0] }]}>
          <Icon size={20} color={colors.white} />
        </View>
        <View style={s.selectInfo}>
          <View style={s.selectTitleRow}>
            <Text style={s.selectTitle}>{card.label}</Text>
            {card.badge && (
              <View style={s.selectBadge}>
                <Text style={s.selectBadgeText}>{card.badge}</Text>
              </View>
            )}
          </View>
          <Text style={s.selectDesc}>{card.description}</Text>
        </View>
      </View>
      <ChevronRight size={18} color={neutral[300]} />
    </TouchableOpacity>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function ActivitiesPage() {
  const [view, setView] = useState<ViewId | null>(null);

  const buildBreadcrumbs = (): BreadcrumbItem[] => {
    const crumbs: BreadcrumbItem[] = [{ label: 'Activities', onPress: view ? () => setView(null) : undefined }];
    if (view === 'tech-menu') crumbs.push({ label: 'Technical Activities' });
    else if (view === 'nontech-menu') crumbs.push({ label: 'Non-Technical Activities' });
    else if (view === 'industry-projects') {
      crumbs.push({ label: 'Technical Activities', onPress: () => setView('tech-menu') });
      crumbs.push({ label: 'Real-Time Industry Projects' });
    } else if (view === 'hackathons') {
      crumbs.push({ label: 'Technical Activities', onPress: () => setView('tech-menu') });
      crumbs.push({ label: 'Hackathons' });
    } else if (view === 'sports') {
      crumbs.push({ label: 'Non-Technical Activities', onPress: () => setView('nontech-menu') });
      crumbs.push({ label: 'Sports' });
    } else if (view === 'other-curricular') {
      crumbs.push({ label: 'Non-Technical Activities', onPress: () => setView('nontech-menu') });
      crumbs.push({ label: 'Other Curricular Activities' });
    }
    // last crumb is always non-clickable
    if (crumbs.length > 0) crumbs[crumbs.length - 1].onPress = undefined;
    return crumbs;
  };

  const ActiveComponent = view ? VIEW_COMPONENTS[view] : undefined;

  // Active leaf pages manage their own ScreenWrapper (they contain FlatLists)
  if (ActiveComponent) {
    return (
      <View style={s.fill}>
        <View style={s.subHeader}>
          <Breadcrumb items={buildBreadcrumbs()} />
        </View>
        <ActiveComponent />
      </View>
    );
  }

  return (
    <ScreenWrapper route={ROUTES.HOD_ACTIVITIES}>
      {/* Breadcrumb */}
      <Breadcrumb items={buildBreadcrumbs()} />

      {/* Top-level: two category cards */}
      {view === null && (
        <View style={s.cardList}>
          {TOP_CARDS.map((card) => (
            <SelectCard key={card.id} card={card} onPress={() => setView(card.id)} />
          ))}
        </View>
      )}

      {/* Technical sub-menu */}
      {view === 'tech-menu' && (
        <View style={s.cardList}>
          {TECH_CARDS.map((card) => (
            <SelectCard key={card.id} card={card} onPress={() => setView(card.id)} />
          ))}
        </View>
      )}

      {/* Non-Technical sub-menu */}
      {view === 'nontech-menu' && (
        <View style={s.cardList}>
          {NON_TECH_CARDS.map((card) => (
            <SelectCard key={card.id} card={card} onPress={() => setView(card.id)} />
          ))}
        </View>
      )}
    </ScreenWrapper>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  fill: { flex: 1, backgroundColor: neutral[50] },

  subHeader: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },

  // Breadcrumb
  breadcrumb: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },
  breadcrumbItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  breadcrumbLink: {
    fontSize: 13,
    fontWeight: '500',
    color: primaryScale[600],
  },
  breadcrumbCurrent: {
    fontSize: 13,
    fontWeight: '600',
    color: neutral[900],
  },

  // Card list
  cardList: { gap: 12 },

  // Select card
  selectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: neutral[100],
    padding: 16,
    ...shadows.card,
  },
  selectCardLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    gap: 14,
    marginRight: 8,
  },
  selectIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  selectInfo: { flex: 1 },
  selectTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  selectTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: neutral[900],
  },
  selectBadge: {
    backgroundColor: primaryScale[50],
    borderRadius: 99,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  selectBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: primaryScale[600],
  },
  selectDesc: {
    fontSize: 12,
    color: neutral[500],
    lineHeight: 17,
    marginTop: 4,
  },
});
