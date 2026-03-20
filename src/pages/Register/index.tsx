import {
  getCurrentUser,
  loginWithEmail,
  registerWithEmail,
} from '@/services/auth';
import { setStoredTokens } from '@/utils/auth';
import { LockOutlined, MailOutlined } from '@ant-design/icons';
import { history, useModel } from '@umijs/max';
import { Alert, Button, Card, Form, Input, Space, Typography } from 'antd';
import { useEffect, useMemo, useState } from 'react';

const { Title, Text } = Typography;

export default function RegisterPage() {
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

  const handleFinish = async (values: {
    email: string;
    password: string;
    confirmPassword: string;
  }) => {
    setSubmitting(true);
    setErrorMessage('');

    try {
      const authResponse = await registerWithEmail({
        email: values.email,
        password: values.password,
      });

      const resolvedTokens =
        authResponse.access && authResponse.refresh
          ? {
              access: authResponse.access,
              refresh: authResponse.refresh,
            }
          : await loginWithEmail({
              email: values.email,
              password: values.password,
            });

      if (!resolvedTokens.access || !resolvedTokens.refresh) {
        throw new Error('Registration succeeded but tokens were not returned.');
      }

      setStoredTokens({
        access: resolvedTokens.access,
        refresh: resolvedTokens.refresh,
      });

      const currentUser = await getCurrentUser(resolvedTokens.access);

      await setInitialState((prev) => ({
        ...prev,
        currentUser,
        authLoading: false,
      }));

      history.push('/home');
    } catch (error: any) {
      setErrorMessage(
        error?.message || 'Unable to create your account right now.',
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
              Create account
            </Text>
            <Title level={2} style={{ margin: '8px 0 8px' }}>
              Join Media Stream
            </Title>
            <Text type="secondary">
              Register with your email to get started.
            </Text>
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
                { min: 8, message: 'Use at least 8 characters.' },
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="Create a password"
                size="large"
                autoComplete="new-password"
              />
            </Form.Item>
            <Form.Item
              label="Confirm password"
              name="confirmPassword"
              dependencies={['password']}
              rules={[
                { required: true, message: 'Please confirm your password.' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('password') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('Passwords do not match.'));
                  },
                }),
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="Confirm your password"
                size="large"
                autoComplete="new-password"
              />
            </Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              block
              size="large"
              loading={submitting}
            >
              Create Account
            </Button>
          </Form>

          <Button
            type="link"
            onClick={() => history.push('/login')}
            style={{ padding: 0, alignSelf: 'flex-start' }}
          >
            Already have an account? Log in
          </Button>
        </Space>
      </Card>
    </div>
  );
}
