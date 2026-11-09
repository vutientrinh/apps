import { useEffect, useMemo, useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import { ActivityIndicator, Linking, Pressable, SectionList, Share, Text, View} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { CameraView, useCameraPermissions } from 'expo-camera';
import QRCode from 'react-native-qrcode-svg';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import BigJs from 'big.js';
import { getItemAsync, setItemAsync } from '@/lib/secure-storage';
import { ApiError, apiRequest, jsonBody } from '@/lib/api';
import { createIdempotencyKey } from '@/lib/idempotency';
import { formatDateTime } from '@/lib/dates';
import { AppHeader, Button, Card, Divider, EmptyState, ErrorState, Icon, Money, Screen, SegmentedTabs, Skeleton, StatusBadge, TextField, OtpInput, useTokens, type IconName } from '@/ui';
import { InitialsAvatar } from '@/ui/auth';
import { fontFamily, radius, type } from '@/theme/tokens';
import type { Recipient, Transaction } from '@web/features/banking/types';
import { filterTransactions, groupTransactionsByDay, groupTransactionsByMonth, limitUsagePercent, remainingMonthlyLimit, transactionTitle, transferAmountError, transferStepForResponse } from './logic';
import { useConfirmTransfer, useContacts, useCreateTopUp, useInvalidateWalletAfterTransfer, useQr, useSendTransfer, useSimulateTopUp, useStatement, useTopUp, useTransaction, useTransactions, useWallet } from './api';
import { PaymentSuccess } from './PaymentSuccess';


const mono = { fontFamily: fontFamily.mono } as const;

function safeError(cause: unknown, fallback: string) {
  if (cause instanceof ApiError && cause.status === 401) return 'Your session has expired. Please sign in again.';
  return cause instanceof Error ? cause.message : fallback;
}

function isUnauthorized(error: unknown) { return error instanceof ApiError && error.status === 401; }

function Alert({ message }: { message: string }) {
  const colors = useTokens();
  return message ? <Text accessibilityRole="alert" style={{ color: colors.destructive, ...type.small }}>{message}</Text> : null;
}

/** Full-bleed list row inside a padded Screen. */
function Bleed({ children }: { children: ReactNode }) {
  return <View style={{ marginHorizontal: -16 }}>{children}</View>;
}

function ActionButton({ title, icon, onPress }: { title: string; icon: IconName; onPress: () => void }) {
  const colors = useTokens();
  return <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress} style={({ pressed }) => ({ flex: 1, minHeight: 72, alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: radius.md, backgroundColor: pressed ? colors.muted : 'transparent' })}>
    <Icon name={icon} size={24} color={colors.primary} />
    <Text numberOfLines={1} style={{ color: colors.foreground, ...type.caption }}>{title}</Text>
  </Pressable>;
}

export function AmountKeypad({ amount, setAmount, onEdit }: { amount: string; setAmount: Dispatch<SetStateAction<string>>; onEdit: () => void }) {
  const colors = useTokens();
  const press = (key: string) => {
    if (key === 'Clear') setAmount('');
    else if (key === 'Delete') setAmount((value) => value.slice(0, -1));
    else setAmount((current) => (current === '0' ? key : `${current}${key}`).replace(/^0+(?=\d)/, '').slice(0, 15));
    void Haptics.selectionAsync().catch(() => undefined);
    onEdit();
  };
  return <View accessibilityLabel={`Amount keypad, current amount ${amount || '0'}`} style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 8, justifyContent: 'space-between' }}>
    {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'Clear', '0', 'Delete'].map((key) => <Pressable key={key} accessibilityRole="button" accessibilityLabel={key === 'Delete' ? 'Delete digit' : key === 'Clear' ? 'Clear amount' : key} onPress={() => press(key)} style={({ pressed }) => ({ width: '32%', minHeight: 52, borderRadius: radius.md, backgroundColor: pressed ? colors.border : colors.muted, alignItems: 'center', justifyContent: 'center' })}>
      {key === 'Delete' ? <Icon name="Delete" size={22} color={colors.foreground} /> : <Text style={{ color: colors.foreground, ...(key === 'Clear' ? type.small : type.h3), fontVariant: ['tabular-nums'] }}>{key}</Text>}
    </Pressable>)}
  </View>;
}

function TransactionRow({ transaction, onPress }: { transaction: Transaction; onPress: () => void }) {
  const colors = useTokens();
  const incoming = transaction.direction === 'IN';
  return <Pressable accessibilityRole="button" accessibilityLabel={`${transactionTitle(transaction)}, ${incoming ? 'incoming' : 'outgoing'} ${transaction.amount} dong, ${transaction.status.toLowerCase()}`} onPress={onPress} style={({ pressed }) => ({ minHeight: 64, paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', gap: 12, alignItems: 'center', backgroundColor: pressed ? colors.muted : 'transparent' })}>
    <View style={{ width: 36, height: 36, borderRadius: radius.full, backgroundColor: colors.muted, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name={incoming ? 'ArrowDownLeft' : 'ArrowUpRight'} size={18} color={incoming ? colors.success : colors.foreground} />
    </View>
    <View style={{ flex: 1, gap: 2 }}>
      <Text numberOfLines={1} style={{ color: colors.foreground, ...type.body, fontWeight: '500' }}>{transactionTitle(transaction)}</Text>
      <Text numberOfLines={1} style={{ color: colors.mutedForeground, ...type.small }}>{formatDateTime(transaction.createdAt)}</Text>
    </View>
    <View style={{ alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
      <Money amount={transaction.amount} direction={incoming ? 'in' : 'out'} />
      {transaction.status !== 'COMPLETED' ? <StatusBadge status={transaction.status} /> : null}
    </View>
  </Pressable>;
}

export function WalletHomeScreen() {
  const router = useRouter(); const colors = useTokens();
  const wallet = useWallet(); const recent = useTransactions({}, 8);
  const [hidden, setHidden] = useState(false);
  useEffect(() => { void getItemAsync('wallet-balance-hidden').then((value) => setHidden(value === 'true')).catch(() => undefined); }, []);
  const refresh = () => { void Promise.all([wallet.refetch(), recent.refetch()]); };
  const toggleHidden = () => { const next = !hidden; setHidden(next); void setItemAsync('wallet-balance-hidden', String(next)).catch(() => undefined); void Haptics.selectionAsync().catch(() => undefined); };
  const info = wallet.data;
  const groups = useMemo(() => groupTransactionsByDay(recent.data?.content ?? []), [recent.data]);
  const bell = <Pressable accessibilityRole="button" accessibilityLabel="Notifications" onPress={() => router.push('/notifications')} style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}><Icon name="Bell" size={22} color={colors.foreground} /></Pressable>;
  return <Screen refreshing={wallet.isRefetching || recent.isRefetching} onRefresh={refresh}>
    <AppHeader title="Wallet" right={bell} />
    {wallet.isLoading ? <View style={{ gap: 16, paddingTop: 24 }}><Skeleton width="45%" height={16} /><Skeleton width="80%" height={40} /><Skeleton height={8} /><Skeleton height={72} /><Skeleton height={64} /><Skeleton height={64} /></View> : null}
    {wallet.isError ? isUnauthorized(wallet.error)
      ? <EmptyState title="Sign in to open your wallet" description="Your balance and transfers are private to your account." action={<Button title="Sign in" onPress={() => router.push('/(auth)/login')} />} />
      : <ErrorState message="Could not load your wallet. Check your connection and try again." retry={refresh} /> : null}
    {info ? <View style={{ paddingTop: 24, gap: 24 }}>
      <View style={{ gap: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ color: colors.mutedForeground, ...type.small }}>Available balance</Text>
          <Pressable accessibilityRole="button" accessibilityLabel={hidden ? 'Show balance' : 'Hide balance'} onPress={toggleHidden} style={{ width: 48, height: 48, marginRight: -12, alignItems: 'center', justifyContent: 'center' }}><Icon name={hidden ? 'EyeOff' : 'Eye'} size={22} color={colors.mutedForeground} /></Pressable>
        </View>
        {hidden
          ? <Text accessibilityLabel="Balance hidden" style={{ color: colors.foreground, ...type.display }}>••••••</Text>
          : <Money amount={info.availableBalance} currency={info.currency} size="display" />}
        {!hidden && new BigJs(info.heldAmount).gt(0) ? <Text style={{ color: colors.mutedForeground, ...type.small }}>On hold <Money amount={info.heldAmount} size="small" tone="muted" /></Text> : null}
        {info.status === 'FROZEN' ? <View style={{ marginTop: 8 }}><StatusBadge status={info.status} label="Wallet frozen" /></View> : null}
      </View>
      <View style={{ gap: 8 }}>
        <View accessibilityRole="progressbar" accessibilityLabel="Monthly transfer limit used" accessibilityValue={{ text: `${info.limits.monthlyOutflowUsed} of ${info.limits.monthlyOutflow} dong` }} style={{ height: 8, backgroundColor: colors.muted, borderRadius: radius.full, overflow: 'hidden' }}>
          <View style={{ width: limitUsagePercent(info.limits.monthlyOutflowUsed, info.limits.monthlyOutflow) as `${number}%`, height: 8, borderRadius: radius.full, backgroundColor: colors.primary }} />
        </View>
        <Text style={{ color: colors.mutedForeground, ...type.small }}><Money amount={info.limits.monthlyOutflowUsed} size="small" tone="muted" /> of <Money amount={info.limits.monthlyOutflow} size="small" tone="muted" /> sent this month</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 4 }}>
        <ActionButton title="Top up" icon="CirclePlus" onPress={() => router.push('/wallet/top-up')} />
        <ActionButton title="Send" icon="ArrowUpRight" onPress={() => router.push('/wallet/send')} />
        <ActionButton title="Scan" icon="ScanLine" onPress={() => router.push('/wallet/scan')} />
        <ActionButton title="My QR" icon="QrCode" onPress={() => router.push('/wallet/qr')} />
      </View>
    </View> : null}
    {info ? <Bleed>
      <Divider />
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 16, paddingRight: 4, paddingTop: 12 }}>
        <Text accessibilityRole="header" style={{ color: colors.foreground, ...type.h3 }}>Activity</Text>
        <Button title="Statement" variant="ghost" onPress={() => router.push('/wallet/statement')} />
      </View>
      {recent.isLoading ? <View style={{ padding: 16, gap: 12 }}><Skeleton height={56} /><Skeleton height={56} /></View> : null}
      {recent.isError ? <ErrorState message="Could not load recent activity." retry={() => void recent.refetch()} /> : null}
      {recent.data && !recent.data.content.length ? <EmptyState title="No activity yet" description="Top up or receive money and it shows here." action={<Button title="Top up" onPress={() => router.push('/wallet/top-up')} />} /> : null}
      {groups.map(([day, items]) => <View key={day}>
        <Text style={{ color: colors.mutedForeground, ...type.caption, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 }}>{day}</Text>
        {items.map((tx, index) => <View key={tx.id}>{index ? <Divider inset={64} /> : null}<TransactionRow transaction={tx} onPress={() => router.push(`/wallet/transaction/${tx.id}`)} /></View>)}
      </View>)}
    </Bleed> : null}
  </Screen>;
}

export function ScanScreen() {
  const router = useRouter(); const colors = useTokens();
  const [permission, requestPermission] = useCameraPermissions(); const [paused, setPaused] = useState(false); const [manual, setManual] = useState(''); const [error, setError] = useState('');
  const routePayload = (value: string) => {
    const [head, ...parts] = value.trim().split('|');
    if (head.startsWith('PAYMENT:')) {
      const recipientId = head.slice('PAYMENT:'.length);
      if (!recipientId) { setError('This QR does not contain a recipient.'); setPaused(false); return; }
      const amountPart = parts.find((part) => part.startsWith('amount='))?.slice(7);
      const noteValue = parts.find((part) => part.startsWith('note='))?.slice(5);
      let notePart = noteValue;
      try { if (noteValue) notePart = decodeURIComponent(noteValue); } catch { notePart = undefined; }
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      router.push(`/wallet/send?recipientId=${encodeURIComponent(recipientId)}${amountPart ? `&amount=${encodeURIComponent(amountPart)}` : ''}${notePart ? `&note=${encodeURIComponent(notePart)}` : ''}`);
      return;
    }
    const bankSim = /^BANKSIM:([^:]+):(\d+)$/.exec(head);
    if (bankSim) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      router.push(`/wallet/top-up?reference=${encodeURIComponent(bankSim[1])}&amount=${encodeURIComponent(bankSim[2])}`);
      return;
    }
    setError('This QR is not a Payment Project wallet or bank QR. Enter the phone number instead.'); setPaused(false);
  };
  if (!permission) return <Screen><AppHeader title="Scan QR" onBack={() => router.back()} /><ActivityIndicator color={colors.primary} style={{ marginTop: 32 }} /></Screen>;
  if (!permission.granted) return <Screen><AppHeader title="Scan QR" onBack={() => router.back()} />
    <EmptyState title="Allow camera to scan" description="The camera reads wallet and bank QR codes. Nothing is recorded." action={<View style={{ gap: 12, alignSelf: 'stretch' }}><Button title="Allow camera" onPress={() => void requestPermission()} /><Button title="Open settings" variant="secondary" onPress={() => void Linking.openSettings()} /></View>} />
  </Screen>;
  return <Screen><AppHeader title="Scan QR" onBack={() => router.back()} />
    <View style={{ gap: 16, paddingTop: 16 }}>
      <View style={{ aspectRatio: 1, maxHeight: 360, overflow: 'hidden', borderRadius: radius.lg, backgroundColor: colors.muted }}>
        <CameraView style={{ flex: 1 }} facing="back" barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={paused ? undefined : ({ data }) => { setPaused(true); routePayload(data); }} />
        {paused ? <View style={{ position: 'absolute', bottom: 12, left: 12, right: 12 }}><Button title="Scan again" onPress={() => { setError(''); setPaused(false); }} /></View> : null}
      </View>
      <Text style={{ color: colors.mutedForeground, ...type.small, textAlign: 'center' }}>Point at a wallet QR or a bank top-up QR.</Text>
      <Alert message={error} />
      <TextField label="Or send to a phone number" value={manual} onChangeText={setManual} keyboardType="phone-pad" placeholder="09…" />
      <Button title="Continue" disabled={!manual.trim()} onPress={() => router.push(`/wallet/send?phone=${encodeURIComponent(manual.trim())}`)} />
    </View>
  </Screen>;
}

function RecipientRow({ recipient, onPress, trailing }: { recipient: Recipient; onPress?: () => void; trailing?: ReactNode }) {
  const colors = useTokens();
  return <Pressable accessibilityRole={onPress ? 'button' : undefined} disabled={!onPress} onPress={onPress} style={({ pressed }) => ({ minHeight: 64, paddingHorizontal: 16, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: pressed && onPress ? colors.muted : 'transparent' })}>
    <InitialsAvatar name={recipient.maskedName} size={40} />
    <View style={{ flex: 1 }}><Text numberOfLines={1} style={{ color: colors.foreground, ...type.body, fontWeight: '500' }}>{recipient.maskedName}</Text><Text style={{ color: colors.mutedForeground, ...type.small }}>{recipient.maskedPhone}</Text></View>
    {trailing}
  </Pressable>;
}

function SummaryRow({ label, children }: { label: string; children: ReactNode }) {
  const colors = useTokens();
  return <View style={{ minHeight: 48, paddingVertical: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
    <Text style={{ color: colors.mutedForeground, ...type.body }}>{label}</Text>
    <View style={{ flexShrink: 1, alignItems: 'flex-end' }}>{typeof children === 'string' ? <Text selectable style={{ color: colors.foreground, ...type.body, textAlign: 'right' }}>{children}</Text> : children}</View>
  </View>;
}

type SendStep = 'recipient' | 'amount' | 'review' | 'otp' | 'success';
const quickAmounts = [{ value: '100000', label: '100K' }, { value: '500000', label: '500K' }, { value: '1000000', label: '1M' }];

export function SendScreen() {
  const router = useRouter(); const params = useLocalSearchParams<{ recipientId?: string; phone?: string; amount?: string; note?: string }>();
  const colors = useTokens();
  const wallet = useWallet(); const contacts = useContacts();
  const seededId = typeof params.recipientId === 'string' ? params.recipientId : '';
  const [step, setStep] = useState<SendStep>('recipient');
  const [recipient, setRecipient] = useState<Recipient | null>(null);
  const [phone, setPhone] = useState(typeof params.phone === 'string' ? params.phone : '');
  const [amount, setAmount] = useState(typeof params.amount === 'string' && /^\d+$/.test(params.amount) ? params.amount : '');
  const [note, setNote] = useState(typeof params.note === 'string' ? params.note : '');
  const [error, setError] = useState(''); const [otpCode, setOtpCode] = useState(''); const [looking, setLooking] = useState(false);
  const [pending, setPending] = useState<{ id: string; otpId: string; devOtp?: string } | null>(null); const [receiptId, setReceiptId] = useState('');
  const key = useRef(createIdempotencyKey()); const confirmKey = useRef(createIdempotencyKey());
  const send = useSendTransfer(); const confirm = useConfirmTransfer(); const invalidateWallet = useInvalidateWalletAfterTransfer();
  const amountError = transferAmountError(amount, wallet.data);
  const remaining = wallet.data ? remainingMonthlyLimit(wallet.data) : '0';
  const onAmountEdit = () => { key.current = createIdempotencyKey(); setError(''); };
  const chooseRecipient = (value: Recipient) => {
    if (value.userId === wallet.data?.id) { setError('You cannot send money to yourself.'); return; }
    if (seededId && value.userId !== seededId) { setError('This phone number does not match the scanned QR.'); return; }
    setRecipient(value); setError(''); key.current = createIdempotencyKey(); setStep('amount');
  };
  const findRecipient = async () => {
    setError(''); setLooking(true);
    try { chooseRecipient(await apiRequest<Recipient>(`/wallets/recipients/lookup?q=${encodeURIComponent(phone.replace(/\D/g, ''))}`)); }
    catch (cause) { setError(cause instanceof ApiError && cause.status === 404 ? 'No wallet uses this phone number.' : safeError(cause, 'Could not find this recipient.')); }
    finally { setLooking(false); }
  };
  const finish = (id: string) => { setReceiptId(id); setStep('success'); invalidateWallet(); };
  const submit = async () => {
    if (!recipient || amountError) { setError(amountError ?? 'Choose a recipient.'); return; }
    setError('');
    try {
      const result = await send.mutateAsync({ recipientUserId: recipient.userId, amount, note, key: key.current });
      if (transferStepForResponse(result) === 'otp' && result.otpId) { setPending({ id: result.id, otpId: result.otpId, devOtp: result.devOtp }); setOtpCode(''); setStep('otp'); return; }
      finish(result.id);
    } catch (cause) { setError(safeError(cause, 'Transfer failed. You can retry safely; you will not be charged twice.')); }
  };
  const submitOtp = async (code = otpCode) => {
    if (!pending || !/^\d{6}$/.test(code) || confirm.isPending) { if (!/^\d{6}$/.test(code)) setError('Enter the 6-digit code.'); return; }
    setError('');
    try { finish((await confirm.mutateAsync({ transferId: pending.id, otpId: pending.otpId, code, key: confirmKey.current })).id); }
    catch (cause) { setError(safeError(cause, 'That code did not work. Check it and try again.')); }
  };
  const shareReceipt = () => void Share.share({ title: 'Transfer receipt', message: `Transfer receipt\nAmount: ${amount} VND\nTo: ${recipient?.maskedName ?? ''}\nReference: ${receiptId}` });
  const back = () => {
    if (step === 'amount') setStep('recipient');
    else if (step === 'review' || step === 'otp') setStep('amount');
    else router.back();
    setError('');
  };

  if (step === 'success') return <Screen>
    <PaymentSuccess title="Money sent"
      amount={<Money amount={amount} size="display" />}
      details={<><Text style={{ color: colors.foreground, ...type.body }}>to {recipient?.maskedName}</Text><Text selectable style={{ color: colors.mutedForeground, ...type.small, ...mono }}>{receiptId}</Text></>}
      actions={<><Button title="Done" onPress={() => router.replace('/(tabs)/wallet')} /><Button title="View receipt" variant="secondary" onPress={() => router.push(`/wallet/transaction/${receiptId}`)} /><Button title="Share receipt" variant="ghost" onPress={shareReceipt} /></>} />
  </Screen>;

  return <Screen><AppHeader title="Send money" onBack={back} />
    <View style={{ gap: 16, paddingTop: 16 }}>
      {step === 'recipient' ? <>
        {seededId ? <Text style={{ color: colors.mutedForeground, ...type.small }}>QR scanned. Enter the recipient&apos;s phone number to confirm who you are paying.</Text> : null}
        <TextField label="Phone number" value={phone} onChangeText={(value) => { setPhone(value); setError(''); }} keyboardType="phone-pad" placeholder="09…" returnKeyType="search" onSubmitEditing={() => { if (phone.trim()) void findRecipient(); }} />
        <Alert message={error} />
        <Button title="Find recipient" loading={looking} onPress={() => void findRecipient()} disabled={!phone.trim()} />
        <Button title="Scan QR instead" variant="secondary" onPress={() => router.push('/wallet/scan')} />
        {!seededId ? <Bleed>
          <Text accessibilityRole="header" style={{ color: colors.mutedForeground, ...type.caption, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 }}>Recent</Text>
          {contacts.isLoading ? <View style={{ paddingHorizontal: 16, gap: 8 }}><Skeleton height={56} /><Skeleton height={56} /></View>
            : contacts.isError ? <ErrorState message="Could not load recent contacts." retry={() => void contacts.refetch()} />
            : contacts.data?.length ? contacts.data.map((contact, index) => <View key={contact.userId}>{index ? <Divider inset={68} /> : null}<RecipientRow recipient={contact} onPress={() => chooseRecipient(contact)} /></View>)
            : <Text style={{ color: colors.mutedForeground, ...type.small, paddingHorizontal: 16 }}>People you send to will show here.</Text>}
        </Bleed> : null}
      </> : null}

      {step === 'amount' && recipient ? <>
        <Bleed><RecipientRow recipient={recipient} trailing={<Button title="Change" variant="ghost" onPress={() => setStep('recipient')} />} /></Bleed>
        <View style={{ alignItems: 'center', gap: 4, paddingVertical: 8 }}>
          <Money amount={amount || '0'} size="display" tone={amount ? 'default' : 'muted'} />
          <Text style={{ color: colors.mutedForeground, ...type.small, textAlign: 'center' }}>Available <Money amount={wallet.data?.availableBalance ?? '0'} size="small" tone="muted" /> · Limit left <Money amount={remaining} size="small" tone="muted" /></Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>{quickAmounts.map(({ value, label }) => <View key={value} style={{ flex: 1 }}><Button title={label} variant="secondary" onPress={() => { setAmount(value); onAmountEdit(); }} /></View>)}</View>
        <AmountKeypad amount={amount} setAmount={setAmount} onEdit={onAmountEdit} />
        <TextField label="Note (optional)" value={note} onChangeText={(value) => { setNote(value); onAmountEdit(); }} maxLength={120} placeholder="What is it for?" />
        {amount ? <Alert message={amountError ?? ''} /> : null}
        <Button title="Review" disabled={Boolean(amountError)} onPress={() => { setError(''); setStep('review'); }} />
      </> : null}

      {step === 'review' && recipient ? <>
        <View style={{ alignItems: 'center', gap: 4, paddingVertical: 8 }}>
          <Text style={{ color: colors.mutedForeground, ...type.small }}>You send</Text>
          <Money amount={amount} size="display" />
        </View>
        <Bleed><Divider /><RecipientRow recipient={recipient} /><Divider /></Bleed>
        <View>
          <SummaryRow label="Fee">Free</SummaryRow>
          {note ? <SummaryRow label="Note">{note}</SummaryRow> : null}
        </View>
        <Text style={{ color: colors.mutedForeground, ...type.small }}>Large transfers ask for a one-time code before the money moves.</Text>
        <Alert message={error} />
        <Button title="Send money" loading={send.isPending} onPress={() => void submit()} />
      </> : null}

      {step === 'otp' && pending ? <>
        <View style={{ gap: 8 }}>
          <Text accessibilityRole="header" style={{ color: colors.foreground, ...type.h2 }}>Enter the code</Text>
          <Text style={{ color: colors.mutedForeground, ...type.body }}>We sent a 6-digit code to your phone to approve sending <Money amount={amount} />.</Text>
        </View>
        <OtpInput value={otpCode} onChange={(value) => { setOtpCode(value); setError(''); }} onComplete={(value) => void submitOtp(value)} error={Boolean(error)} disabled={confirm.isPending} />
        {pending.devOtp ? <Pressable accessibilityRole="button" accessibilityLabel={`Fill dev code ${pending.devOtp}`} onPress={() => { const code = pending.devOtp ?? ''; setOtpCode(code); setError(''); void submitOtp(code); }} style={{ alignSelf: 'flex-start', minHeight: 44, paddingHorizontal: 12, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ color: colors.mutedForeground, ...type.small }}>Dev code <Text style={{ color: colors.foreground, ...mono }}>{pending.devOtp}</Text></Text><Text style={{ color: colors.primary, ...type.small, fontWeight: '600' }}>Fill</Text>
        </Pressable> : null}
        <Alert message={error} />
        <Button title="Confirm transfer" loading={confirm.isPending} disabled={otpCode.length !== 6} onPress={() => void submitOtp()} />
      </> : null}
    </View>
  </Screen>;
}

const topUpAmounts = [{ value: '100000', label: '100K' }, { value: '200000', label: '200K' }, { value: '500000', label: '500K' }];

export function TopUpScreen() {
  const router = useRouter(); const params = useLocalSearchParams<{ id?: string; reference?: string; amount?: string }>();
  const colors = useTokens();
  const wallet = useWallet();
  const queryClient = useQueryClient();
  const id = typeof params.id === 'string' ? params.id : '';
  const scannedReference = typeof params.reference === 'string' ? params.reference : '';
  const scannedAmount = typeof params.amount === 'string' && /^\d+$/.test(params.amount) ? params.amount : '';
  const topUp = useTopUp(id); const create = useCreateTopUp(); const simulate = useSimulateTopUp();
  const [amount, setAmount] = useState(scannedAmount); const [error, setError] = useState(''); const [notice, setNotice] = useState(''); const [clock, setClock] = useState(0); const [copied, setCopied] = useState(false);
  const idempotencyKey = useRef(createIdempotencyKey()); const bankTransferKey = useRef(createIdempotencyKey());
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    const initialTick = setTimeout(() => { setClock(Date.now()); interval = setInterval(() => setClock(Date.now()), 1000); }, 0);
    return () => { clearTimeout(initialTick); if (interval) clearInterval(interval); };
  }, []);
  useEffect(() => { bankTransferKey.current = createIdempotencyKey(); }, [id, scannedReference, scannedAmount]);
  useEffect(() => { if (topUp.data?.status === 'COMPLETED') void queryClient.invalidateQueries({ queryKey: ['wallet'] }); }, [topUp.data?.status, queryClient]);
  useEffect(() => { if (!copied) return; const timer = setTimeout(() => setCopied(false), 2000); return () => clearTimeout(timer); }, [copied]);
  const setTopUpAmount = (value: string) => { setAmount(value.replace(/\D/g, '')); setError(''); idempotencyKey.current = createIdempotencyKey(); };
  const createTopUp = async () => {
    if (!/^\d+$/.test(amount) || amount === '0') { setError('Enter a whole VND amount above 0.'); return; }
    setError('');
    try { const result = await create.mutateAsync({ amount, idempotencyKey: idempotencyKey.current }); router.replace(`/wallet/top-up?id=${encodeURIComponent(result.id)}`); }
    catch (cause) { setError(safeError(cause, 'Could not create the top-up QR.')); }
  };
  const simulateBankTransfer = async () => {
    if (!wallet.data || !topUp.data) return;
    setError('');
    try { await simulate.mutateAsync({ wallet: wallet.data, topUp: topUp.data, idempotencyKey: bankTransferKey.current }); }
    catch (cause) { setError(safeError(cause, 'Bank transfer failed.')); }
  };
  const scannedTransfer = async () => {
    if (!wallet.data || !scannedReference || !scannedAmount) return;
    setError(''); setNotice('');
    try {
      const accounts = await apiRequest<{ id: string }[]>('/bank-sim/accounts');
      const source = accounts.find((account) => account.id === wallet.data?.id);
      if (!source) throw new Error('Mock bank account is unavailable.');
      await apiRequest('/bank-sim/transfers', { method: 'POST', headers: { 'Idempotency-Key': bankTransferKey.current }, body: jsonBody({ fromAccountId: source.id, toReference: scannedReference, amount: scannedAmount }) });
      setNotice('Transfer sent. The receiving wallet updates when the bank confirms.');
    } catch (cause) { setError(safeError(cause, 'Could not submit the bank transfer.')); }
  };
  const copyReference = (reference: string) => { void Clipboard.setStringAsync(reference); void Haptics.selectionAsync().catch(() => undefined); setCopied(true); };
  const result = topUp.data;
  const seconds = result ? Math.max(0, Math.ceil((Date.parse(result.expiresAt) - clock) / 1000)) : 0;

  if (result?.status === 'COMPLETED') return <Screen>
    <PaymentSuccess title="Top-up received"
      amount={<Money amount={result.amount} size="display" />}
      details={<>{wallet.data && !wallet.isFetching ? <Text style={{ color: colors.mutedForeground, ...type.small }}>Available now <Money amount={wallet.data.availableBalance} size="small" tone="muted" /></Text> : null}<Text selectable style={{ color: colors.mutedForeground, ...type.small, ...mono }}>{result.reference}</Text></>}
      actions={<><Button title="Done" onPress={() => router.replace('/(tabs)/wallet')} /><Button title="Top up again" variant="secondary" onPress={() => router.replace('/wallet/top-up')} /></>} />
  </Screen>;

  return <Screen refreshing={Boolean(id) && topUp.isRefetching} onRefresh={id ? () => void topUp.refetch() : undefined}>
    <AppHeader title={scannedReference ? 'Bank QR' : 'Top up'} onBack={() => router.back()} />
    <View style={{ gap: 16, paddingTop: 16 }}>
      {scannedReference ? <>
        <View style={{ alignItems: 'center', gap: 4, paddingVertical: 8 }}>
          <Text style={{ color: colors.mutedForeground, ...type.small }}>Bank transfer</Text>
          <Money amount={scannedAmount || '0'} size="display" />
        </View>
        <SummaryRow label="Reference"><Text selectable style={{ color: colors.foreground, ...type.body, ...mono }}>{scannedReference}</Text></SummaryRow>
        <Alert message={error} />
        {notice ? <Text accessibilityLiveRegion="polite" style={{ color: colors.success, ...type.small }}>{notice}</Text> : null}
        <Button title="Simulate bank transfer (dev)" loading={simulate.isPending} onPress={() => void scannedTransfer()} />
      </> : null}

      {!scannedReference && !id ? <>
        <Text style={{ color: colors.mutedForeground, ...type.body }}>Pay from any Vietnamese bank app with VietQR. No fee; money arrives as soon as your bank confirms.</Text>
        <TextField label="Amount (VND)" value={amount} onChangeText={setTopUpAmount} keyboardType="number-pad" placeholder="0" error={error || undefined} />
        {amount && /^\d+$/.test(amount) ? <Money amount={amount} size="small" tone="muted" /> : null}
        <View style={{ flexDirection: 'row', gap: 8 }}>{topUpAmounts.map(({ value, label }) => <View key={value} style={{ flex: 1 }}><Button title={label} variant="secondary" onPress={() => setTopUpAmount(value)} /></View>)}</View>
        <Button title="Create VietQR" loading={create.isPending} onPress={() => void createTopUp()} />
      </> : null}

      {id && topUp.isLoading ? <Skeleton height={360} /> : null}
      {id && topUp.isError ? <ErrorState message="Could not load this top-up." retry={() => void topUp.refetch()} /> : null}
      {result ? <>
        <Card style={{ alignItems: 'center', gap: 12 }}>
          <StatusBadge status={result.status} label={result.status === 'PENDING' ? 'Waiting for your bank' : undefined} />
          <Money amount={result.amount} size="h2" />
          {result.status === 'PENDING' ? <QRCode value={result.qrPayload} size={220} quietZone={12} /> : null}
          {result.status === 'PENDING' ? <Text style={{ color: colors.mutedForeground, ...type.small, fontVariant: ['tabular-nums'] }}>Expires in {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}</Text> : null}
        </Card>
        <SummaryRow label="Reference"><Text selectable style={{ color: colors.foreground, ...type.body, ...mono }}>{result.reference}</Text></SummaryRow>
        <Button title={copied ? 'Copied' : 'Copy reference'} variant="secondary" onPress={() => copyReference(result.reference)} />
        <Alert message={error} />
        {result.status === 'PENDING' ? <>
          <Text style={{ color: colors.mutedForeground, ...type.small }}>Keep this screen open. It updates by itself when the bank confirms.</Text>
          <Button title="Simulate bank transfer (dev)" variant="ghost" loading={simulate.isPending} onPress={() => void simulateBankTransfer()} />
        </> : <Button title="Start a new top-up" onPress={() => router.replace('/wallet/top-up')} />}
      </> : null}
    </View>
  </Screen>;
}

const typeFilters = [
  { key: 'ALL', label: 'All' }, { key: 'TOP_UP', label: 'Top ups' }, { key: 'TRANSFER_IN', label: 'Received' }, { key: 'TRANSFER_OUT', label: 'Sent' },
  { key: 'PAYMENT', label: 'Payments' }, { key: 'REFUND', label: 'Refunds' }, { key: 'WITHDRAWAL', label: 'Withdrawals' },
];
const directionFilters = [{ key: 'ALL', label: 'In & out' }, { key: 'IN', label: 'Money in' }, { key: 'OUT', label: 'Money out' }];
const isoDate = /^\d{4}-\d{2}-\d{2}$/;

export function StatementScreen() {
  const router = useRouter(); const colors = useTokens();
  const wallet = useWallet();
  const [typeFilter, setTypeFilter] = useState('ALL'); const [direction, setDirection] = useState('ALL'); const [from, setFrom] = useState(''); const [to, setTo] = useState(''); const [search, setSearch] = useState('');
  const fromValid = !from || isoDate.test(from); const toValid = !to || isoDate.test(to);
  const params = useMemo(() => ({
    ...(typeFilter !== 'ALL' ? { type: typeFilter } : {}), ...(direction !== 'ALL' ? { direction } : {}),
    ...(from && fromValid ? { from } : {}), ...(to && toValid ? { to } : {}),
  }), [typeFilter, direction, from, to, fromValid, toValid]);
  const query = useStatement(params);
  const rows = useMemo(() => filterTransactions(query.data?.pages.flatMap((page) => page.content) ?? [], search), [query.data, search]);
  const sections = useMemo(() => groupTransactionsByMonth(rows).map(([title, data]) => ({ title, data })), [rows]);
  const summary = query.data?.pages[0]?.summary;
  const filtered = Boolean(search || typeFilter !== 'ALL' || direction !== 'ALL' || from || to);
  const clear = () => { setSearch(''); setTypeFilter('ALL'); setDirection('ALL'); setFrom(''); setTo(''); };
  const refresh = () => { void query.refetch(); void wallet.refetch(); };
  const header = <View style={{ gap: 16, paddingTop: 16 }}>
    <View style={{ paddingHorizontal: 16, gap: 4 }}>
      <Text style={{ color: colors.mutedForeground, ...type.small }}>Balance</Text>
      {wallet.data ? <Money amount={wallet.data.ledgerBalance} size="display" /> : <Skeleton width="70%" height={40} />}
      {summary ? <View style={{ flexDirection: 'row', gap: 24, marginTop: 8 }}>
        <View><Text style={{ color: colors.mutedForeground, ...type.caption }}>In</Text><Money amount={summary.totalIn} direction="in" /></View>
        <View><Text style={{ color: colors.mutedForeground, ...type.caption }}>Out</Text><Money amount={summary.totalOut} direction="out" /></View>
      </View> : null}
    </View>
    <View style={{ paddingHorizontal: 16, gap: 12 }}>
      <TextField label="Search" value={search} onChangeText={setSearch} placeholder="Reference, note or name" returnKeyType="search" />
      <SegmentedTabs items={typeFilters} selected={typeFilter} onChange={setTypeFilter} />
      <SegmentedTabs items={directionFilters} selected={direction} onChange={setDirection} />
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1 }}><TextField label="From" value={from} onChangeText={setFrom} placeholder="YYYY-MM-DD" maxLength={10} error={fromValid ? undefined : 'Use YYYY-MM-DD'} /></View>
        <View style={{ flex: 1 }}><TextField label="To" value={to} onChangeText={setTo} placeholder="YYYY-MM-DD" maxLength={10} error={toValid ? undefined : 'Use YYYY-MM-DD'} /></View>
      </View>
    </View>
    {query.isLoading ? <View style={{ paddingHorizontal: 16, gap: 12 }}><Skeleton height={56} /><Skeleton height={56} /><Skeleton height={56} /></View> : null}
    {query.isError ? <ErrorState message="Could not load your statement." retry={refresh} /> : null}
    {!query.isLoading && !query.isError && rows.length === 0 ? <EmptyState title={filtered ? 'No matching transactions' : 'No transactions yet'} description={search ? 'Search covers the transactions loaded so far.' : undefined} action={filtered ? <Button title="Clear filters" variant="secondary" onPress={clear} /> : undefined} /> : null}
  </View>;
  return <Screen scroll={false} style={{ padding: 0 }}>
    <View style={{ paddingHorizontal: 16 }}><AppHeader title="Statement" onBack={() => router.back()} /></View>
    <SectionList
      sections={sections}
      keyExtractor={(item, index) => `${item.id}-${index}`}
      ListHeaderComponent={header}
      contentContainerStyle={{ paddingBottom: 32 }}
      stickySectionHeadersEnabled
      renderSectionHeader={({ section }) => {
        const completed = section.data.filter((item) => item.status === 'COMPLETED');
        const net = completed.reduce((sum, item) => item.direction === 'IN' ? sum.plus(item.amount) : sum.minus(item.amount), new BigJs(0));
        return <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 6, backgroundColor: colors.background, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <Text accessibilityRole="header" style={{ color: colors.foreground, ...type.caption }}>{section.title}</Text>
          <Text style={{ color: colors.mutedForeground, ...type.caption }}>Net <Money amount={net.toFixed(0)} size="caption" tone="muted" /></Text>
        </View>;
      }}
      ItemSeparatorComponent={() => <Divider inset={64} />}
      renderItem={({ item }) => <TransactionRow transaction={item} onPress={() => router.push(`/wallet/transaction/${item.id}`)} />}
      onRefresh={refresh}
      refreshing={query.isRefetching && !query.isFetchingNextPage}
      onEndReached={() => { if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage(); }}
      onEndReachedThreshold={0.3}
      ListFooterComponent={query.isFetchingNextPage ? <ActivityIndicator color={colors.primary} style={{ padding: 16 }} /> : undefined}
    />
  </Screen>;
}

export function TransactionDetailScreen() {
  const router = useRouter(); const { id = '' } = useLocalSearchParams<{ id: string }>(); const query = useTransaction(id);
  const colors = useTokens(); const transaction = query.data;
  const share = () => transaction ? void Share.share({ title: 'Transaction receipt', message: `Payment Project wallet receipt\n${transactionTitle(transaction)}\nAmount: ${transaction.amount} VND\nStatus: ${transaction.status}\nReference: ${transaction.reference}\nDate: ${formatDateTime(transaction.createdAt)}` }) : undefined;
  return <Screen><AppHeader title="Transaction" onBack={() => router.back()} />
    {query.isLoading ? <View style={{ gap: 12, paddingTop: 24 }}><Skeleton width="50%" height={16} /><Skeleton width="75%" height={40} /><Skeleton height={200} /></View> : null}
    {query.isError ? <ErrorState message="Could not load this transaction." retry={() => void query.refetch()} /> : null}
    {transaction ? <View style={{ gap: 16, paddingTop: 24 }}>
      <View style={{ gap: 8 }}>
        <Text style={{ color: colors.mutedForeground, ...type.body }}>{transactionTitle(transaction)}</Text>
        <Money amount={transaction.amount} size="display" direction={transaction.direction === 'IN' ? 'in' : 'out'} />
        <StatusBadge status={transaction.status} />
      </View>
      <Bleed><Divider /></Bleed>
      <View>
        {transaction.counterparty ? <SummaryRow label={transaction.direction === 'IN' ? 'From' : 'To'}>{`${transaction.counterparty.maskedName} · ${transaction.counterparty.maskedPhone}`}</SummaryRow> : null}
        <SummaryRow label="Date">{formatDateTime(transaction.createdAt)}</SummaryRow>
        <SummaryRow label="Balance after"><Money amount={transaction.balanceAfter} /></SummaryRow>
        {transaction.note ? <SummaryRow label="Note">{transaction.note}</SummaryRow> : null}
        <SummaryRow label="Reference"><Text selectable style={{ color: colors.foreground, ...type.small, ...mono }}>{transaction.reference || '—'}</Text></SummaryRow>
        {transaction.journalId ? <SummaryRow label="Journal"><Text selectable style={{ color: colors.foreground, ...type.small, ...mono }}>{transaction.journalId}</Text></SummaryRow> : null}
      </View>
      {transaction.timeline.length ? <>
        <Bleed><Divider /></Bleed>
        <Text accessibilityRole="header" style={{ color: colors.foreground, ...type.h3 }}>Timeline</Text>
        <View style={{ gap: 12 }}>{transaction.timeline.map((event, index) => <View key={`${event.createdAt}-${index}`} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <StatusBadge status={event.status} />
          <Text style={{ color: colors.mutedForeground, ...type.small }}>{formatDateTime(event.createdAt)}</Text>
        </View>)}</View>
      </> : null}
      <Button title="Share receipt" variant="secondary" onPress={share} />
    </View> : null}
  </Screen>;
}

export function MyQrScreen() {
  const router = useRouter(); const colors = useTokens(); const qr = useQr();
  const [amount, setAmount] = useState(''); const [note, setNote] = useState('');
  const payload = qr.data ? `${qr.data.payload}${amount ? `|amount=${amount}` : ''}${note.trim() ? `|note=${encodeURIComponent(note.trim())}` : ''}` : '';
  const share = () => qr.data ? void Share.share({ title: 'My Payment Project QR', message: `Send money to my Payment Project wallet.\n${payload}` }) : undefined;
  return <Screen><AppHeader title="My QR" onBack={() => router.back()} />
    {qr.isLoading ? <View style={{ paddingTop: 24 }}><Skeleton height={340} /></View> : null}
    {qr.isError ? <ErrorState message="Could not load your QR." retry={() => void qr.refetch()} /> : null}
    {qr.data ? <View style={{ gap: 16, paddingTop: 24 }}>
      <Card style={{ alignItems: 'center', gap: 12 }}>
        <Text style={{ color: colors.foreground, ...type.h3 }}>{qr.data.maskedName}</Text>
        <QRCode value={payload} size={232} quietZone={12} />
        {amount ? <Money amount={amount} size="h2" /> : null}
        <Text style={{ color: colors.mutedForeground, ...type.small, textAlign: 'center' }}>{amount ? 'Scanning fills in this amount.' : 'Anyone with a Payment Project wallet can scan this to pay you.'}</Text>
      </Card>
      <TextField label="Ask for an amount (optional)" value={amount} onChangeText={(value) => setAmount(value.replace(/\D/g, '').replace(/^0+/, '').slice(0, 15))} keyboardType="number-pad" placeholder="VND" />
      <TextField label="Note (optional)" value={note} onChangeText={setNote} maxLength={120} />
      <Button title="Share QR" onPress={share} />
    </View> : null}
  </Screen>;
}

