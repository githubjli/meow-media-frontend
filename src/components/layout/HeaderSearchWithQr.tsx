import { getAccountProfile } from '@/services/accountProfile';
import { CurrentUser } from '@/services/auth';
import {
  getProductOrderDetail as fetchProductOrderDetail,
  resolvePaymentQr,
  payProductOrderWithWallet as submitProductOrderWalletPayment,
} from '@/services/productOrders';
import { parsePaymentQrText as parseProductPaymentQrText } from '@/utils/paymentQr';
import {
  LockOutlined,
  QrcodeOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import { getIntl, history } from '@umijs/max';
import { Alert, Button, Input, message, Modal, Space, Typography } from 'antd';
import { useEffect, useRef, useState } from 'react';

const { Text } = Typography;

const debugLog = (...args: any[]) => {
  if (process.env.NODE_ENV !== 'development') return;
  // eslint-disable-next-line no-console
  console.log(...args);
};

const HeaderSearchWithQr = ({
  isDark,
  currentUser,
}: {
  isDark?: boolean;
  currentUser?: CurrentUser | null;
}) => {
  const intl = getIntl();
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [mode, setMode] = useState<'camera' | 'upload' | 'manual'>('camera');
  const [qrText, setQrText] = useState('');
  const [selectedImageName, setSelectedImageName] = useState('');
  const [decodingImage, setDecodingImage] = useState(false);
  const [parseError, setParseError] = useState('');
  const [cameraError, setCameraError] = useState('');
  const [loadingOrder, setLoadingOrder] = useState(false);
  const [confirmOrder, setConfirmOrder] = useState<any>(null);
  const [confirmError, setConfirmError] = useState('');
  const [walletPassword, setWalletPassword] = useState('');
  const [payingWithWallet, setPayingWithWallet] = useState(false);
  const [submittedTxid, setSubmittedTxid] = useState('');
  const [profileLinkedWalletId, setProfileLinkedWalletId] = useState('');
  const [hasFetchedProfileWallet, setHasFetchedProfileWallet] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const zxingControlsRef = useRef<any>(null);
  const zxingReaderRef = useRef<any>(null);
  const detectedRef = useRef(false);

  const stopCamera = () => {
    zxingControlsRef.current?.stop?.();
    zxingControlsRef.current = null;
    zxingReaderRef.current?.reset?.();
    zxingReaderRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    detectedRef.current = false;
  };

  const mapGetUserMediaError = (error: any) => {
    const name = String(error?.name || '');
    const messageText = String(error?.message || '');
    const insecureContext = !window.isSecureContext;

    if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
      return intl.formatMessage({ id: 'qrScan.cameraDenied' });
    }
    if (
      name === 'NotFoundError' ||
      name === 'DevicesNotFoundError' ||
      name === 'OverconstrainedError'
    ) {
      return intl.formatMessage({ id: 'qrScan.cameraUnavailable' });
    }
    if (name === 'NotSupportedError') {
      return intl.formatMessage({ id: 'qrScan.cameraUnsupported' });
    }
    if (name === 'SecurityError' || insecureContext) {
      return intl.formatMessage({ id: 'qrScan.cameraInsecureContext' });
    }
    return messageText || intl.formatMessage({ id: 'qrScan.failed' });
  };

  const handleParsedQr = async (text: string) => {
    debugLog('[QR_SCAN] raw text:', text);
    const tryShortSignedPayload = () => {
      try {
        const parsed = JSON.parse(String(text || ''));
        if (!parsed || typeof parsed !== 'object') return null;
        const isShortProductQr =
          parsed.v !== undefined &&
          String(parsed.t || '') === 'product_payment' &&
          String(parsed.o || '').trim() &&
          String(parsed.s || '').trim();
        if (!isShortProductQr) return null;
        return parsed;
      } catch (error) {
        return null;
      }
    };
    const shortPayload = tryShortSignedPayload();
    if (shortPayload) {
      try {
        setLoadingOrder(true);
        setParseError('');
        const resolved = await resolvePaymentQr(text);
        const normalizedTxid = String(resolved?.txid || '').trim();
        setOpen(false);
        stopCamera();
        setQrText('');
        setSelectedImageName('');
        setConfirmError('');
        setWalletPassword('');
        setSubmittedTxid(normalizedTxid);
        setConfirmOrder({
          ...resolved,
          product_title_snapshot: resolved?.product_title || '-',
          order_no: resolved?.order_no || shortPayload.o,
          status:
            resolved?.status ||
            (String(resolved?.payment_status || '').toLowerCase() === 'paid'
              ? 'paid'
              : 'pending_payment'),
        });
        setConfirmOpen(true);
      } catch (error) {
        setParseError(
          intl.formatMessage({ id: 'qrScan.resolve.invalidExpired' }),
        );
      } finally {
        setLoadingOrder(false);
      }
      return;
    }

    const parsed = parseProductPaymentQrText(text);
    if (parsed.orderNo) {
      try {
        setLoadingOrder(true);
        setParseError('');
        const orderDetail = await fetchProductOrderDetail(parsed.orderNo);
        stopCamera();
        setOpen(false);
        setQrText('');
        setParseError('');
        setCameraError('');
        setConfirmError('');
        setWalletPassword('');
        setSubmittedTxid('');
        setConfirmOrder(orderDetail);
        setConfirmOpen(true);
      } catch (error: any) {
        setParseError(
          error?.message ||
            intl.formatMessage({ id: 'qrScan.loadOrderDetailFailed' }),
        );
      } finally {
        setLoadingOrder(false);
      }
      return;
    }

    if (parsed.address || parsed.amount) {
      setParseError(intl.formatMessage({ id: 'qrScan.noOrderNo' }));
      return;
    }

    setParseError(
      parsed.error
        ? intl.formatMessage({ id: 'qrScan.invalidPayload' })
        : intl.formatMessage({ id: 'qrScan.failed' }),
    );
  };

  const startCameraScan = async () => {
    if (!open) return;

    debugLog('[QR_SCAN] secure context', window.isSecureContext);
    debugLog(
      '[QR_SCAN] mediaDevices exists',
      Boolean(navigator.mediaDevices?.getUserMedia),
    );

    if (!window.isSecureContext) {
      setCameraError(
        intl.formatMessage({ id: 'qrScan.cameraInsecureContext' }),
      );
      setMode('upload');
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError(intl.formatMessage({ id: 'qrScan.cameraUnsupported' }));
      setMode('upload');
      return;
    }

    try {
      stopCamera();
      detectedRef.current = false;
      setCameraError('');
      setParseError('');
      setMode('camera');
      debugLog('[QR_SCAN] getUserMedia start');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
        },
        audio: false,
      });
      debugLog('[QR_SCAN] getUserMedia success');
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await new Promise<void>((resolve) => {
          const element = videoRef.current;
          if (!element) {
            resolve();
            return;
          }
          if (element.readyState >= 1) {
            resolve();
            return;
          }
          element.onloadedmetadata = () => resolve();
          setTimeout(() => resolve(), 500);
        });
        await videoRef.current.play();
      }

      try {
        const ZXing = await import(
          /* webpackChunkName: "zxing" */ '@zxing/browser'
        );
        debugLog('[QR_SCAN] zxing loaded');
        const { BrowserMultiFormatReader } = ZXing;
        const codeReader = new BrowserMultiFormatReader();
        zxingReaderRef.current = codeReader;
        zxingControlsRef.current = await codeReader.decodeFromVideoDevice(
          undefined,
          videoRef.current as HTMLVideoElement,
          (result) => {
            const value = String(result?.getText?.() || '');
            if (!value || detectedRef.current) return;
            detectedRef.current = true;
            debugLog('[QR_SCAN] decoded text', value);
            stopCamera();
            void handleParsedQr(value);
          },
        );
      } catch (scanError: any) {
        debugLog('[QR_SCAN] zxing load failed', scanError?.message);
        setCameraError(
          scanError?.message ||
            intl.formatMessage({ id: 'qrScan.scannerInitFailed' }),
        );
        setMode('upload');
        stopCamera();
      }
    } catch (error: any) {
      debugLog(
        '[QR_SCAN] getUserMedia error name/message',
        error?.name,
        error?.message,
      );
      setCameraError(mapGetUserMediaError(error));
      setMode('upload');
      stopCamera();
    }
  };

  const decodeQrFromImageFile = async (file: File) => {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('image_load_failed'));
      };
      img.src = objectUrl;
    });

    const maxSize = 2400;
    const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('image_decode_failed');
    }
    context.drawImage(image, 0, 0, width, height);
    const imageData = context.getImageData(0, 0, width, height);
    if (!imageData?.data?.length) {
      throw new Error('image_decode_failed');
    }

    const buildPaddedCanvas = (
      baseCanvas: HTMLCanvasElement,
      padding: number,
      scaleFactor = 1,
    ) => {
      const padded = document.createElement('canvas');
      const targetWidth = Math.max(
        1,
        Math.round(baseCanvas.width * scaleFactor),
      );
      const targetHeight = Math.max(
        1,
        Math.round(baseCanvas.height * scaleFactor),
      );
      padded.width = targetWidth + padding * 2;
      padded.height = targetHeight + padding * 2;
      const paddedContext = padded.getContext('2d');
      if (!paddedContext) return null;
      paddedContext.fillStyle = '#ffffff';
      paddedContext.fillRect(0, 0, padded.width, padded.height);
      paddedContext.drawImage(
        baseCanvas,
        padding,
        padding,
        targetWidth,
        targetHeight,
      );
      return padded;
    };

    const ZXing = await import(
      /* webpackChunkName: "zxing" */ '@zxing/browser'
    );
    const { BrowserMultiFormatReader } = ZXing;
    const decodeCanvas = async (targetCanvas: HTMLCanvasElement) => {
      const codeReader = new BrowserMultiFormatReader();
      try {
        const targetImage = await new Promise<HTMLImageElement>(
          (resolve, reject) => {
            const img = new Image();
            img.onload = () => {
              resolve(img);
            };
            img.onerror = () => {
              reject(new Error('image_load_failed'));
            };
            img.src = targetCanvas.toDataURL('image/png');
          },
        );
        const result = await codeReader
          .decodeFromImageElement(targetImage)
          .catch(() => null);
        return String(result?.getText?.() || '').trim();
      } finally {
        codeReader.reset?.();
      }
    };

    const paddedCanvas = buildPaddedCanvas(canvas, 32);
    const enlargedPaddedCanvas = buildPaddedCanvas(canvas, 32, 1.25);
    const candidates = [canvas, paddedCanvas, enlargedPaddedCanvas].filter(
      Boolean,
    ) as HTMLCanvasElement[];

    for (const candidate of candidates) {
      const decoded = await decodeCanvas(candidate);
      if (decoded) return decoded;
    }
    throw new Error('qr_not_found');
  };

  const onUploadImageFile = async (file?: File | null) => {
    if (!file) return;
    if (!String(file.type || '').startsWith('image/')) {
      setParseError(
        intl.formatMessage({ id: 'qrScan.upload.unsupportedFileType' }),
      );
      return;
    }
    setParseError('');
    setSelectedImageName(file.name);
    setDecodingImage(true);
    try {
      const decoded = await decodeQrFromImageFile(file);
      message.success(intl.formatMessage({ id: 'qrScan.upload.detected' }));
      await handleParsedQr(decoded);
    } catch (error: any) {
      if (error?.message === 'image_load_failed') {
        setParseError(
          intl.formatMessage({ id: 'qrScan.upload.imageLoadFailed' }),
        );
      } else if (error?.message === 'qr_not_found') {
        setParseError(intl.formatMessage({ id: 'qrScan.upload.noQrDetected' }));
      } else {
        setParseError(intl.formatMessage({ id: 'qrScan.upload.decodeFailed' }));
      }
    } finally {
      setDecodingImage(false);
    }
  };

  useEffect(() => {
    if (!open) {
      stopCamera();
    }
  }, [open]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const onOpenModal = () => {
    setParseError('');
    setCameraError('');
    setQrText('');
    setSelectedImageName('');
    setOpen(true);
    setMode('upload');
  };

  const onSubmitManualQr = async () => {
    const value = String(qrText || '').trim();
    if (!value) {
      setParseError(intl.formatMessage({ id: 'qrScan.emptyManual' }));
      return;
    }
    await handleParsedQr(value);
  };

  const account = currentUser;
  const effectiveLinkedWalletId = String(
    account?.linked_wallet_id || profileLinkedWalletId || '',
  ).trim();
  const hasLinkedWallet = Boolean(effectiveLinkedWalletId);
  const canUseWalletPayment = Boolean(
    hasLinkedWallet &&
      String(confirmOrder?.status || '').toLowerCase() === 'pending_payment',
  );
  const effectiveTxid = String(
    submittedTxid || confirmOrder?.txid || '',
  ).trim();
  const canSubmitWalletPayment = Boolean(canUseWalletPayment && !effectiveTxid);

  useEffect(() => {
    if (!confirmOpen || hasFetchedProfileWallet) return;
    if (account?.linked_wallet_id) {
      setHasFetchedProfileWallet(true);
      return;
    }
    if (!account?.email) return;

    let cancelled = false;
    (async () => {
      try {
        const profile = await getAccountProfile();
        if (cancelled) return;
        setProfileLinkedWalletId(
          String(profile?.linked_wallet_id || '').trim(),
        );
      } catch (error) {
        // keep silent; fallback UI will show unavailable state.
      } finally {
        if (!cancelled) {
          setHasFetchedProfileWallet(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    confirmOpen,
    hasFetchedProfileWallet,
    account?.linked_wallet_id,
    account?.email,
  ]);

  useEffect(() => {
    if (!confirmOpen) return;
    debugLog('[PAYMENT]', {
      linked_wallet_id: account?.linked_wallet_id,
      primary_user_address: account?.primary_user_address,
      profile_linked_wallet_id: profileLinkedWalletId,
      canUseWalletPayment,
    });
  }, [
    confirmOpen,
    account?.linked_wallet_id,
    account?.primary_user_address,
    profileLinkedWalletId,
    canUseWalletPayment,
  ]);

  const onCopyText = async (value?: string | number | null) => {
    const content = String(value || '').trim();
    if (!content) return;
    try {
      await navigator.clipboard.writeText(content);
      message.success(intl.formatMessage({ id: 'qrScan.copied' }));
    } catch (error) {
      message.error(intl.formatMessage({ id: 'qrScan.copyFailed' }));
    }
  };

  const onPayWithLinkedWallet = async () => {
    if (payingWithWallet) return;
    if (!confirmOrder?.order_no) return;
    if (effectiveTxid) return;
    if (!walletPassword) {
      setConfirmError(
        intl.formatMessage({ id: 'qrScan.walletPasswordRequired' }),
      );
      return;
    }

    setPayingWithWallet(true);
    setConfirmError('');
    try {
      const payload: { wallet_id?: string; password: string } = {
        password: walletPassword,
      };
      if (effectiveLinkedWalletId) {
        payload.wallet_id = effectiveLinkedWalletId;
      }
      const response = await submitProductOrderWalletPayment(
        String(confirmOrder.order_no),
        payload,
      );
      const txid = String(response?.txid || response?.transaction_id || '');
      setSubmittedTxid(txid);
      message.success(intl.formatMessage({ id: 'qrScan.walletSubmitted' }));
      const latestOrder = await fetchProductOrderDetail(
        String(confirmOrder.order_no),
      );
      setConfirmOrder(latestOrder);
      setWalletPassword('');
    } catch (error: any) {
      const resolveBackendError = (payload: any): string => {
        if (!payload) return '';
        if (typeof payload === 'string') return payload;
        if (typeof payload.detail === 'string') return payload.detail;
        if (typeof payload.message === 'string') return payload.message;
        if (
          Array.isArray(payload.non_field_errors) &&
          payload.non_field_errors[0]
        ) {
          return String(payload.non_field_errors[0]);
        }
        if (Array.isArray(payload.password) && payload.password[0]) {
          return String(payload.password[0]);
        }
        if (Array.isArray(payload.wallet_id) && payload.wallet_id[0]) {
          return String(payload.wallet_id[0]);
        }
        if (payload.error) {
          return resolveBackendError(payload.error);
        }
        return '';
      };
      const sanitizePaymentError = (value: string) => {
        const text = String(value || '').trim();
        if (!text) return '';
        const hasInternalFieldLeak =
          /wallet_id|funding_account_ids|change_account_id/i.test(text);
        if (hasInternalFieldLeak) {
          return '';
        }
        return text;
      };
      const backendError =
        resolveBackendError(error?.data) ||
        resolveBackendError(error?.response?.data);
      setConfirmError(
        sanitizePaymentError(backendError) ||
          sanitizePaymentError(error?.message) ||
          intl.formatMessage({ id: 'qrScan.walletPayFailed' }),
      );
    } finally {
      setPayingWithWallet(false);
    }
  };

  const onRefreshPaymentStatus = async () => {
    if (!confirmOrder?.order_no) return;
    setLoadingOrder(true);
    try {
      const latestOrder = await fetchProductOrderDetail(
        String(confirmOrder.order_no),
      );
      setConfirmOrder(latestOrder);
    } catch (error: any) {
      setConfirmError(error?.message || '');
    } finally {
      setLoadingOrder(false);
    }
  };

  return (
    <>
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          width: '100%',
          padding: '0 20px',
          gap: 8,
        }}
      >
        <Input.Search
          placeholder={intl.formatMessage({ id: 'search.global.placeholder' })}
          allowClear
          style={{ maxWidth: 560, width: '100%', borderRadius: 12 }}
          size="middle"
          onSearch={(value) => debugLog('Searching for:', value)}
        />
        <Button
          type="text"
          icon={<QrcodeOutlined style={{ fontSize: 16 }} />}
          style={{
            width: 34,
            height: 34,
            borderRadius: 10,
            color: isDark ? '#EFBC5C' : '#4b5563',
          }}
          onClick={onOpenModal}
        />
      </div>
      <Modal
        title={intl.formatMessage({ id: 'qrScan.modalTitle' })}
        open={open}
        onCancel={() => {
          stopCamera();
          setOpen(false);
        }}
        onOk={mode === 'manual' ? onSubmitManualQr : undefined}
        okText={
          mode === 'manual'
            ? intl.formatMessage({ id: 'qrScan.scan' })
            : undefined
        }
        cancelText={intl.formatMessage({ id: 'common.cancel' })}
        confirmLoading={loadingOrder}
      >
        <Space direction="vertical" size={8} style={{ width: '100%' }}>
          <Space>
            <Button
              type={mode === 'camera' ? 'primary' : 'default'}
              onClick={() => {
                setMode('camera');
                void startCameraScan();
              }}
            >
              {intl.formatMessage({ id: 'qrScan.mode.camera' })}
            </Button>
            <Button
              type={mode === 'upload' ? 'primary' : 'default'}
              onClick={() => setMode('upload')}
            >
              {intl.formatMessage({ id: 'qrScan.mode.upload' })}
            </Button>
          </Space>

          {mode === 'camera' ? (
            <>
              <video
                ref={videoRef}
                style={{ width: '100%', borderRadius: 12, background: '#000' }}
                muted
                playsInline
                autoPlay
              />
              <Text type="secondary">
                {intl.formatMessage({ id: 'qrScan.cameraHint' })}
              </Text>
              {cameraError ? (
                <Alert type="warning" showIcon message={cameraError} />
              ) : null}
            </>
          ) : mode === 'upload' ? (
            <>
              <Text type="secondary">
                {intl.formatMessage({ id: 'qrScan.upload.hint' })}
              </Text>
              <input
                ref={uploadInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  void onUploadImageFile(file);
                  event.currentTarget.value = '';
                }}
              />
              <Button
                icon={<UploadOutlined />}
                loading={decodingImage}
                onClick={() => uploadInputRef.current?.click()}
              >
                {intl.formatMessage({ id: 'qrScan.upload.choose' })}
              </Button>
              {selectedImageName ? (
                <Text type="secondary">
                  {intl.formatMessage(
                    { id: 'qrScan.upload.selected' },
                    { filename: selectedImageName },
                  )}
                </Text>
              ) : null}
              <Button
                type="link"
                size="small"
                onClick={() => setMode('manual')}
              >
                {intl.formatMessage({ id: 'qrScan.upload.pasteFallback' })}
              </Button>
            </>
          ) : (
            <>
              <Text type="secondary">
                {intl.formatMessage({ id: 'qrScan.pasteHint' })}
              </Text>
              <Input.TextArea
                rows={5}
                value={qrText}
                onChange={(event) => setQrText(event.target.value)}
                placeholder={intl.formatMessage({
                  id: 'qrScan.pastePlaceholder',
                })}
              />
            </>
          )}

          {parseError ? (
            <Alert type="error" showIcon message={parseError} />
          ) : null}
        </Space>
      </Modal>
      <Modal
        title={intl.formatMessage({ id: 'qrScan.confirmModal.title' })}
        open={confirmOpen}
        onCancel={() => {
          setConfirmOpen(false);
          setConfirmError('');
          setWalletPassword('');
        }}
        footer={null}
      >
        {confirmOrder ? (
          <Space direction="vertical" size={10} style={{ width: '100%' }}>
            <Text>
              {intl.formatMessage({ id: 'account.productOrders.product' })}:{' '}
              <Text strong>{confirmOrder.product_title_snapshot || '-'}</Text>
            </Text>
            <Text>
              {intl.formatMessage({ id: 'account.productOrders.orderNo' })}:{' '}
              <Text strong>{confirmOrder.order_no || '-'}</Text>
            </Text>
            <Text>
              {intl.formatMessage({
                id: 'account.productOrders.expectedAmount',
              })}
              :{' '}
              <Text strong>{String(confirmOrder.expected_amount || '-')}</Text>
            </Text>
            <Text>
              {intl.formatMessage({ id: 'account.productOrders.currency' })}:{' '}
              <Text strong>{confirmOrder.currency || 'THB-LTT'}</Text>
            </Text>
            <Text>
              {intl.formatMessage({
                id: 'account.productOrders.paymentAddress',
              })}
              : <Text strong>{confirmOrder.pay_to_address || '-'}</Text>
            </Text>
            <Text>
              {intl.formatMessage({ id: 'account.productOrders.expiresAt' })}:{' '}
              <Text strong>{confirmOrder.expires_at || '-'}</Text>
            </Text>
            <Text>
              {intl.formatMessage({
                id: 'account.productOrders.paymentStatus',
              })}
              : <Text strong>{String(confirmOrder.payment_status || '-')}</Text>
            </Text>
            <Alert
              type="warning"
              showIcon
              message={intl.formatMessage({
                id: 'qrScan.confirmModal.notProof',
              })}
            />

            {canUseWalletPayment ? (
              <>
                <Input.Password
                  value={walletPassword}
                  onChange={(event) => setWalletPassword(event.target.value)}
                  placeholder={intl.formatMessage({
                    id: 'qrScan.confirmModal.walletPasswordPlaceholder',
                  })}
                  prefix={<LockOutlined />}
                />
                <Button
                  type="primary"
                  loading={payingWithWallet}
                  disabled={
                    payingWithWallet ||
                    !walletPassword ||
                    !canSubmitWalletPayment
                  }
                  onClick={onPayWithLinkedWallet}
                >
                  {intl.formatMessage({
                    id: 'qrScan.confirmModal.payWithWallet',
                  })}
                </Button>
              </>
            ) : (
              <Alert
                type="info"
                showIcon
                message={intl.formatMessage({
                  id: 'qrScan.confirmModal.walletUnavailable',
                })}
              />
            )}

            {effectiveTxid ? (
              <Alert
                type="success"
                showIcon
                message={intl.formatMessage({
                  id: 'qrScan.confirmModal.txSubmitted',
                })}
                description={
                  <Space>
                    <Text code>{effectiveTxid}</Text>
                    <Button
                      size="small"
                      onClick={() => onCopyText(effectiveTxid)}
                    >
                      {intl.formatMessage({ id: 'common.copy' })}
                    </Button>
                  </Space>
                }
              />
            ) : null}
            {effectiveTxid ? (
              <Alert
                type="info"
                showIcon
                message={intl.formatMessage({
                  id: 'qrScan.confirmModal.waitingVerification',
                })}
              />
            ) : null}
            {confirmError ? (
              <Alert type="error" showIcon message={confirmError} />
            ) : null}

            <Space wrap>
              <Button loading={loadingOrder} onClick={onRefreshPaymentStatus}>
                {intl.formatMessage({
                  id: 'account.productOrders.refreshPaymentStatus',
                })}
              </Button>
              <Button
                onClick={() =>
                  history.push(
                    `/account/product-orders/${confirmOrder.order_no}`,
                  )
                }
              >
                {intl.formatMessage({ id: 'qrScan.confirmModal.viewDetail' })}
              </Button>
              <Button onClick={() => onCopyText(confirmOrder.pay_to_address)}>
                {intl.formatMessage({ id: 'qrScan.confirmModal.copyAddress' })}
              </Button>
              <Button onClick={() => onCopyText(confirmOrder.expected_amount)}>
                {intl.formatMessage({ id: 'qrScan.confirmModal.copyAmount' })}
              </Button>
            </Space>
          </Space>
        ) : null}
      </Modal>
    </>
  );
};

export default HeaderSearchWithQr;
