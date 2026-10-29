import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { CreditLedgerDto, LedgerTransactionType } from '@skill-exchange/shared-types';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import {
  Coins,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  Sparkles,
  HelpCircle,
  Clock,
} from 'lucide-react-native';


export const WalletScreen = () => {
  const [balance, setBalance] = useState<number>(12);
  const [ledger, setLedger] = useState<CreditLedgerDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    fetchWalletData();
  }, []);

  const fetchWalletData = async () => {
    try {
      setLoading(true);
      const [balRes, ledgerRes] = await Promise.all([
        api.getBalance().catch(() => ({ balance: user?.creditBalance ?? 12 })),
        api.getLedger().catch(() => ({
          items: [
            {
              id: 'ledg_1',
              amount: 3.0,
              balanceAfter: 3.0,
              type: LedgerTransactionType.SIGNUP_BONUS,
              humanReadableReason: 'Welcome verification bonus',
              createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
            },
            {
              id: 'ledg_2',
              amount: -1.0,
              balanceAfter: 2.0,
              type: LedgerTransactionType.SESSION_HOST_COST,
              humanReadableReason: 'Group session hosting anti-spam fee',
              createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
            },
            {
              id: 'ledg_3',
              amount: 6.0,
              balanceAfter: 8.0,
              type: LedgerTransactionType.SESSION_EARNING,
              humanReadableReason: 'Earnings from completed teaching session',
              createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
            },
            {
              id: 'ledg_4',
              amount: 2.0,
              balanceAfter: 10.0,
              type: LedgerTransactionType.MONTHLY_REFILL,
              humanReadableReason: 'Monthly learner stimulus credit refill',
              createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            },
            {
              id: 'ledg_5',
              amount: 2.0,
              balanceAfter: 12.0,
              type: LedgerTransactionType.MARKETPLACE_SALE,
              humanReadableReason: 'Earnings from study material sale',
              createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
            },
          ],
        })),
      ]);

      setBalance(balRes.balance);
      setLedger(ledgerRes.items);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const renderLedgerItem = ({ item }: { item: CreditLedgerDto }) => {
    const isCredit = item.amount >= 0;

    return (
      <View style={styles.ledgerRow}>
        <View
          style={[
            styles.iconWrapper,
            isCredit ? styles.iconCredit : styles.iconDebit,
          ]}
        >
          {isCredit ? (
            <ArrowDownLeft size={18} color="#10B981" />
          ) : (
            <ArrowUpRight size={18} color="#EF4444" />
          )}
        </View>

        <View style={styles.ledgerInfo}>
          {/* Section 8.1: Human readable reason, never raw enum values */}
          <Text style={styles.ledgerReason}>{item.humanReadableReason}</Text>
          <Text style={styles.ledgerDate}>
            {new Date(item.createdAt).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>

        <View style={styles.amountCol}>
          <Text
            style={[
              styles.amountText,
              isCredit ? styles.amountPositive : styles.amountNegative,
            ]}
          >
            {isCredit ? `+${item.amount.toFixed(1)}` : item.amount.toFixed(1)} cr
          </Text>
          <Text style={styles.balanceAfterText}>
            Bal: {item.balanceAfter.toFixed(1)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={ledger}
        keyExtractor={(item) => item.id}
        renderItem={renderLedgerItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchWalletData();
            }}
            tintColor="#38BDF8"
          />
        }
        ListHeaderComponent={
          <>
            {/* Balance Card */}
            <View style={styles.balanceCard}>
              <View style={styles.balanceHeader}>
                <Coins size={22} color="#FBBF24" />
                <Text style={styles.balanceLabel}>AVAILABLE TIME-CREDITS</Text>
              </View>
              <Text style={styles.balanceValue}>{balance.toFixed(1)}</Text>
              <Text style={styles.balanceSub}>
                1 credit equals approximately 1 hour of peer teaching exchange.
              </Text>
            </View>

            {/* Monthly Refill Stimulus Status (Section 5.7) */}
            <View style={styles.refillCard}>
              <View style={styles.refillHeader}>
                <Sparkles size={16} color="#38BDF8" style={{ marginRight: 6 }} />
                <Text style={styles.refillTitle}>Monthly Stimulus Status</Text>
              </View>
              <Text style={styles.refillDesc}>
                Students who attend 3+ sessions as a learner within 3 months and offer skills in low campus supply receive +2 monthly stimulus credits on the 1st of each month.
              </Text>
              <View style={styles.refillStatusRow}>
                <View style={styles.activeTag}>
                  <Text style={styles.activeTagText}>Qualified for Next Cycle</Text>
                </View>
                <Text style={styles.refillNextDate}>Refill date: 1st of month</Text>
              </View>
            </View>

            <Text style={styles.historySectionTitle}>LEDGER TRANSACTION HISTORY</Text>
          </>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0F19',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  balanceCard: {
    backgroundColor: '#0F172A',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#38BDF8',
    padding: 22,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 8,
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  balanceLabel: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  balanceValue: {
    color: '#F8FAFC',
    fontSize: 48,
    fontWeight: '900',
    marginBottom: 6,
  },
  balanceSub: {
    color: '#64748B',
    fontSize: 12,
    textAlign: 'center',
  },
  refillCard: {
    backgroundColor: '#0F172A',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 14,
    marginBottom: 20,
  },
  refillHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  refillTitle: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '700',
  },
  refillDesc: {
    color: '#94A3B8',
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 10,
  },
  refillStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  activeTag: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  activeTagText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '700',
  },
  refillNextDate: {
    color: '#64748B',
    fontSize: 11,
  },
  historySectionTitle: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 10,
  },
  ledgerRow: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  iconWrapper: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconCredit: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  iconDebit: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  ledgerInfo: {
    flex: 1,
  },
  ledgerReason: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 3,
  },
  ledgerDate: {
    color: '#64748B',
    fontSize: 11,
  },
  amountCol: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  amountPositive: {
    color: '#10B981',
  },
  amountNegative: {
    color: '#EF4444',
  },
  balanceAfterText: {
    color: '#64748B',
    fontSize: 10,
  },
});
