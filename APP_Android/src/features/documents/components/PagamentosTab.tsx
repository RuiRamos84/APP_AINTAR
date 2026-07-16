import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, RADIUS, SPACING } from '@/shared/theme/colors';
import { useInvoiceAmount } from '../hooks/useDocumentDetails';

const fmtDateTime = (val?: string | null) => {
  if (!val) return 'N/D';
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return val;
    return d.toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return val; }
};

const getPaymentMethodLabel = (method?: string) => {
  if (!method) return 'N/D';
  const u = method.toUpperCase();
  if (u === 'MBWAY') return 'MB WAY';
  if (u === 'CARD') return 'Cartão de Crédito/Débito';
  if (u === 'MULTIBANCO' || u === 'REFERENCE') return 'Referência Multibanco';
  return method;
};

const getPaymentStatus = (status?: string): { label: string; color: string; bg: string; icon: React.ComponentProps<typeof MaterialIcons>['name'] } => {
  if (!status) return { label: 'Pendente', color: COLORS.warning, bg: COLORS.warningSurface, icon: 'schedule' };
  switch (status.toUpperCase()) {
    case 'SUCCESS':   return { label: 'Pago', color: COLORS.success, bg: COLORS.successSurface, icon: 'check-circle' };
    case 'REFUNDED':  return { label: 'Devolvido', color: COLORS.secondary, bg: COLORS.secondarySurface, icon: 'receipt' };
    case 'DECLINED':
    case 'REJECTED':  return { label: 'Recusado', color: COLORS.error, bg: COLORS.errorSurface, icon: 'error' };
    case 'EXPIRED':   return { label: 'Expirado', color: COLORS.error, bg: COLORS.errorSurface, icon: 'error' };
    case 'PENDING':
    case 'PENDING_VALIDATION':
    case 'CREATED':   return { label: 'Pendente', color: COLORS.warning, bg: COLORS.warningSurface, icon: 'schedule' };
    default:          return { label: status, color: COLORS.textDisabled, bg: COLORS.overlay, icon: 'info' };
  }
};

const parsePaymentReference = (ref?: string | Record<string, unknown>): Record<string, any> => {
  if (!ref) return {};
  if (typeof ref === 'object') return ref as Record<string, any>;
  if (typeof ref === 'string' && ref.startsWith('{')) {
    try { return JSON.parse(ref); } catch { return { reference: ref }; }
  }
  return { paymentReference: { reference: ref, entity: '52791' } };
};

const PagamentosTab = ({ docId }: { docId: number | null }) => {
  const { data, isLoading } = useInvoiceAmount(docId);
  const invoice = data?.invoice_data;

  if (isLoading) {
    return <ActivityIndicator size="small" color={COLORS.primary} style={{ marginVertical: SPACING.lg }} />;
  }

  if (!invoice) {
    return <Text style={pay.emptyText}>Não foram encontrados dados de fatura para este documento.</Text>;
  }

  if (!invoice.invoice && !invoice.amount) {
    return <Text style={pay.emptyText}>Este documento não possui valor a pagar.</Text>;
  }

  const status = getPaymentStatus(invoice.payment_status);
  const amount = invoice.invoice ?? invoice.amount ?? 0;
  const hasPaymentInfo = !!(invoice.payment_status || invoice.payment_method || invoice.payment_reference);
  const method = invoice.payment_method?.toUpperCase();

  const parsedRef = parsePaymentReference(invoice.payment_reference);
  const refObj = parsedRef?.paymentReference ?? parsedRef;
  const entity = refObj?.entity ?? refObj?.paymentEntity ?? '52791';
  const reference = refObj?.reference ?? 'N/D';
  const expiry = invoice.sibs_expiry ?? refObj?.expireDate;
  const phone = parsedRef?.token?.value ?? parsedRef?.reference ?? 'Não disponível';

  return (
    <View style={{ gap: SPACING.md }}>
      {/* Resumo */}
      <View style={pay.card}>
        <View style={pay.cardHeader}>
          <MaterialIcons name="attach-money" size={16} color={COLORS.primary} />
          <Text style={pay.cardTitle}>Resumo do Pagamento</Text>
        </View>

        <View style={pay.summaryRow}>
          <MaterialIcons name="attach-money" size={14} color={COLORS.textDisabled} />
          <Text style={pay.summaryLabel}>Valor</Text>
          <Text style={pay.summaryValue}>{amount}€</Text>
        </View>
        <View style={pay.summaryRow}>
          <MaterialIcons name="credit-card" size={14} color={COLORS.textDisabled} />
          <Text style={pay.summaryLabel}>Método</Text>
          <Text style={pay.summaryValue}>{getPaymentMethodLabel(invoice.payment_method)}</Text>
        </View>
        <View style={pay.summaryRow}>
          <MaterialIcons name="payment" size={14} color={COLORS.textDisabled} />
          <Text style={pay.summaryLabel}>Estado</Text>
          <View style={[pay.statusChip, { backgroundColor: status.bg }]}>
            <MaterialIcons name={status.icon} size={12} color={status.color} />
            <Text style={[pay.statusChipText, { color: status.color }]}>{status.label}</Text>
          </View>
        </View>
        {invoice.order_id && (
          <View style={pay.summaryRow}>
            <MaterialIcons name="receipt" size={14} color={COLORS.textDisabled} />
            <Text style={pay.summaryLabel}>Ref. Interna</Text>
            <Text style={pay.summaryValue}>{invoice.order_id}</Text>
          </View>
        )}
      </View>

      {/* Multibanco */}
      {hasPaymentInfo && (method === 'MULTIBANCO' || method === 'REFERENCE') && (
        <View style={pay.card}>
          <Text style={pay.cardTitle}>Referência Multibanco</Text>
          <View style={{ flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.xs, flexWrap: 'wrap' }}>
            <View style={{ flex: 1, minWidth: 90 }}>
              <Text style={pay.summaryLabel}>Entidade</Text>
              <Text style={pay.monoValue}>{entity}</Text>
            </View>
            <View style={{ flex: 1, minWidth: 90 }}>
              <Text style={pay.summaryLabel}>Referência</Text>
              <Text style={pay.monoValue}>{reference}</Text>
            </View>
            <View style={{ flex: 1, minWidth: 90 }}>
              <Text style={pay.summaryLabel}>Válida até</Text>
              <Text style={pay.summaryValue}>{fmtDateTime(expiry)}</Text>
            </View>
          </View>
        </View>
      )}

      {/* MB WAY */}
      {hasPaymentInfo && method === 'MBWAY' && (
        <View style={pay.card}>
          <Text style={pay.cardTitle}>Pagamento MB WAY</Text>
          <Text style={pay.summaryLabel}>Número de Telefone</Text>
          <Text style={pay.summaryValue}>{phone}</Text>
        </View>
      )}
    </View>
  );
};

const pay = StyleSheet.create({
  emptyText: { fontSize: 13, color: COLORS.textDisabled, fontStyle: 'italic', textAlign: 'center', paddingVertical: SPACING.lg },
  card: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: SPACING.md,
    borderWidth: 1, borderColor: COLORS.border, gap: SPACING.xs,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: SPACING.xs },
  cardTitle: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  summaryLabel: { fontSize: 12, color: COLORS.textSecondary, flex: 1 },
  summaryValue: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary },
  monoValue: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary, fontFamily: 'monospace' },
  statusChip: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    borderRadius: RADIUS.pill, paddingHorizontal: SPACING.sm, paddingVertical: 2,
  },
  statusChipText: { fontSize: 11, fontWeight: '700' },
});

export default PagamentosTab;
