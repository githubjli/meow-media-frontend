import { getCurrentUser, loginWithEmail } from '@/services/auth';
import { setStoredTokens } from '@/utils/auth';
import { LockOutlined, MailOutlined } from '@ant-design/icons';
import { history, useIntl, useLocation, useModel } from '@umijs/max';
import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  Space,
  Typography,
  message,
} from 'antd';
import { useEffect, useState } from 'react';

const { Title, Text } = Typography;

export default function LoginPage() {
  const intl = useIntl();
  const location = useLocation();
  const [form] = Form.useForm();
  const { initialState, setInitialState } = useModel('@@initialState');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const isLoggedIn = Boolean(initialState?.currentUser?.email);
  const isCheckingAuth = Boolean(initialState?.authLoading);
  const redirectTarget =
    new URLSearchParams(location.search).get('redirect') || '/home';
  const showAuthDebugNote =
    process.env.NODE_ENV === 'development' &&
    new URLSearchParams(location.search).get('authDebug') === '1';

  useEffect(() => {
    if (!isCheckingAuth && isLoggedIn) {
      history.replace(redirectTarget);
    }
  }, [isCheckingAuth, isLoggedIn, redirectTarget]);

  const handleFinish = async (values: { email: string; password: string }) => {
    setSubmitting(true);
    setErrorMessage('');

    try {
      const authResponse = await loginWithEmail(values);

      if (!authResponse.access || !authResponse.refresh) {
        throw new Error(intl.formatMessage({ id: 'auth.login.error.tokens' }));
      }

      setStoredTokens({
        access: authResponse.access,
        refresh: authResponse.refresh,
      });

      const currentUser = await getCurrentUser(authResponse.access);

      await setInitialState((prev) => ({
        ...prev,
        currentUser,
        authLoading: false,
      }));

      if (authResponse.daily_login_reward?.granted) {
        message.success(
          intl.formatMessage(
            { id: 'auth.login.dailyReward' },
            { points: authResponse.daily_login_reward.points_amount ?? 0 },
          ),
        );
      }

      history.push(redirectTarget);
    } catch (error: any) {
      setErrorMessage(
        error?.message ||
          intl.formatMessage({ id: 'auth.login.error.unavailable' }),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        minHeight: 'calc(100vh - 120px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <Card
        style={{ width: '100%', maxWidth: 440, borderRadius: 20 }}
        styles={{ body: { padding: 32 } }}
      >
        <Space direction="vertical" size={20} style={{ width: '100%' }}>
          <div>
            <Text
              style={{
                color: '#13a8a8',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}
            >
              {intl.formatMessage({ id: 'auth.login.welcome' })}
            </Text>
            <Title level={2} style={{ margin: '8px 0 8px' }}>
              {intl.formatMessage({ id: 'auth.login.title' })}
            </Title>
            <Text type="secondary">
              {intl.formatMessage({ id: 'auth.login.subtitle' })}
            </Text>
          </div>

          {showAuthDebugNote ? (
            <Text type="secondary">
              {intl.formatMessage({ id: 'auth.common.proxyNotice' })}
            </Text>
          ) : null}

          {errorMessage ? (
            <Alert type="error" message={errorMessage} showIcon />
          ) : null}

          <Form
            form={form}
            layout="vertical"
            onFinish={handleFinish}
            requiredMark={false}
          >
            <Form.Item
              label={intl.formatMessage({ id: 'auth.common.email' })}
              name="email"
              rules={[
                {
                  required: true,
                  message: intl.formatMessage({
                    id: 'auth.common.emailRequired',
                  }),
                },
                {
                  type: 'email',
                  message: intl.formatMessage({
                    id: 'auth.common.emailInvalid',
                  }),
                },
              ]}
            >
              <Input
                prefix={<MailOutlined />}
                placeholder="you@example.com"
                size="large"
                autoComplete="email"
              />
            </Form.Item>
            <Form.Item
              label={intl.formatMessage({ id: 'auth.common.password' })}
              name="password"
              rules={[
                {
                  required: true,
                  message: intl.formatMessage({
                    id: 'auth.common.passwordRequired',
                  }),
                },
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder={intl.formatMessage({
                  id: 'auth.login.passwordPlaceholder',
                })}
                size="large"
                autoComplete="current-password"
              />
            </Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              block
              size="large"
              loading={submitting}
            >
              {intl.formatMessage({ id: 'auth.login.submit' })}
            </Button>
          </Form>

          <Button
            type="link"
            onClick={() =>
              history.push(
                `/register?redirect=${encodeURIComponent(redirectTarget)}`,
              )
            }
            style={{ padding: 0, alignSelf: 'flex-start' }}
          >
            {intl.formatMessage({ id: 'auth.login.createOne' })}
          </Button>
        </Space>
      </Card>
    </div>
  );
}
