import {
  getCurrentUser,
  loginWithEmail,
  registerWithEmail,
} from '@/services/auth';
import { setStoredTokens } from '@/utils/auth';
import { LockOutlined, MailOutlined } from '@ant-design/icons';
import { history, useIntl, useModel } from '@umijs/max';
import { Alert, Button, Card, Form, Input, Space, Typography } from 'antd';
import { useEffect, useState } from 'react';

const { Title, Text } = Typography;

export default function RegisterPage() {
  const intl = useIntl();
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
        throw new Error(
          intl.formatMessage({ id: 'auth.register.error.tokens' }),
        );
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
        error?.message ||
          intl.formatMessage({ id: 'auth.register.error.unavailable' }),
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
              {intl.formatMessage({ id: 'auth.register.welcome' })}
            </Text>
            <Title level={2} style={{ margin: '8px 0 8px' }}>
              {intl.formatMessage({ id: 'auth.register.title' })}
            </Title>
            <Text type="secondary">
              {intl.formatMessage({ id: 'auth.register.subtitle' })}
            </Text>
          </div>

          <Text type="secondary">
            {intl.formatMessage({ id: 'auth.common.proxyNotice' })}
          </Text>

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
                  message: intl.formatMessage({ id: 'auth.common.emailRequired' }),
                },
                {
                  type: 'email',
                  message: intl.formatMessage({ id: 'auth.common.emailInvalid' }),
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
                {
                  min: 8,
                  message: intl.formatMessage({ id: 'auth.register.passwordMin' }),
                },
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder={intl.formatMessage({
                  id: 'auth.register.passwordPlaceholder',
                })}
                size="large"
                autoComplete="new-password"
              />
            </Form.Item>
            <Form.Item
              label={intl.formatMessage({ id: 'auth.register.confirmPassword' })}
              name="confirmPassword"
              dependencies={['password']}
              rules={[
                {
                  required: true,
                  message: intl.formatMessage({
                    id: 'auth.register.confirmRequired',
                  }),
                },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('password') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(
                      new Error(
                        intl.formatMessage({
                          id: 'auth.register.confirmMismatch',
                        }),
                      ),
                    );
                  },
                }),
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder={intl.formatMessage({
                  id: 'auth.register.confirmPlaceholder',
                })}
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
              {intl.formatMessage({ id: 'auth.register.submit' })}
            </Button>
          </Form>

          <Button
            type="link"
            onClick={() => history.push('/login')}
            style={{ padding: 0, alignSelf: 'flex-start' }}
          >
            {intl.formatMessage({ id: 'auth.register.logIn' })}
          </Button>
        </Space>
      </Card>
    </div>
  );
}
