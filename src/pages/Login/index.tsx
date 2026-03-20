import { getCurrentUser, loginWithEmail } from '@/services/auth';
import { setStoredTokens } from '@/utils/auth';
import { LockOutlined, MailOutlined } from '@ant-design/icons';
import { history, useModel } from '@umijs/max';
import { Alert, Button, Card, Form, Input, Space, Typography } from 'antd';
import { useEffect, useMemo, useState } from 'react';

const { Title, Text } = Typography;

export default function LoginPage() {
  const [form] = Form.useForm();
  const { initialState, setInitialState } = useModel('@@initialState');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const isLoggedIn = Boolean(initialState?.currentUser?.email);
  const isCheckingAuth = Boolean(initialState?.authLoading);

  useEffect(() => {
    if (!isCheckingAuth && isLoggedIn) {
      history.replace('/home');
    }
  }, [isCheckingAuth, isLoggedIn]);

  const helperText = useMemo(
    () =>
      initialState?.authBaseUrl
        ? `Connected to ${initialState.authBaseUrl}`
        : 'Using the same origin for auth requests.',
    [initialState?.authBaseUrl],
  );

  const handleFinish = async (values: { email: string; password: string }) => {
    setSubmitting(true);
    setErrorMessage('');

    try {
      const authResponse = await loginWithEmail(values);

      if (!authResponse.access || !authResponse.refresh) {
        throw new Error('Login succeeded but tokens were not returned.');
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

      history.push('/home');
    } catch (error: any) {
      setErrorMessage(error?.message || 'Unable to log in right now.');
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
              Welcome back
            </Text>
            <Title level={2} style={{ margin: '8px 0 8px' }}>
              Log in to Media Stream
            </Title>
            <Text type="secondary">Use your email to continue.</Text>
          </div>

          <Text type="secondary">{helperText}</Text>

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
              label="Email"
              name="email"
              rules={[
                { required: true, message: 'Please enter your email.' },
                { type: 'email', message: 'Please enter a valid email.' },
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
              label="Password"
              name="password"
              rules={[
                { required: true, message: 'Please enter your password.' },
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="Enter your password"
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
              Log In
            </Button>
          </Form>

          <Button
            type="link"
            onClick={() => history.push('/register')}
            style={{ padding: 0, alignSelf: 'flex-start' }}
          >
            Need an account? Create one
          </Button>
        </Space>
      </Card>
    </div>
  );
}
