import PageIntroCard from '@/components/PageIntroCard';
import { getAccountProfile } from '@/services/accountProfile';
import { changeAccountPassword } from '@/services/accountSecurity';
import { LockOutlined, MailOutlined } from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { history, useIntl, useModel } from '@umijs/max';
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

const { Text } = Typography;

export default function AccountSettingsPage() {
  const intl = useIntl();
  const { initialState } = useModel('@@initialState');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [form] = Form.useForm();
  const isLoggedIn = Boolean(initialState?.currentUser?.email);

  useEffect(() => {
    if (!initialState?.authLoading && !isLoggedIn) {
      history.replace(`/login?redirect=${encodeURIComponent('/settings')}`);
      return;
    }

    if (!isLoggedIn) {
      return;
    }

    setLoading(true);
    setErrorMessage('');
    getAccountProfile()
      .then((profile) => setEmail(profile?.email || ''))
      .catch((error: any) =>
        setErrorMessage(
          error?.message ||
            intl.formatMessage({ id: 'account.settings.error.load' }),
        ),
      )
      .finally(() => setLoading(false));
  }, [initialState?.authLoading, intl, isLoggedIn]);

  const handlePasswordChange = async (values: {
    current_password: string;
    new_password: string;
    confirm_password: string;
  }) => {
    setSaving(true);
    try {
      await changeAccountPassword(values);
      message.success(
        intl.formatMessage({ id: 'account.settings.password.success' }),
      );
      form.resetFields();
    } catch (error: any) {
      message.error(
        error?.message ||
          intl.formatMessage({ id: 'account.settings.password.error' }),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageContainer title={false}>
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <PageIntroCard
          title={intl.formatMessage({ id: 'account.settings.title' })}
          description={intl.formatMessage({ id: 'account.settings.subtitle' })}
        />

        {errorMessage ? (
          <Alert type="warning" showIcon message={errorMessage} />
        ) : null}

        <Card
          title={intl.formatMessage({ id: 'account.settings.accountInfo' })}
          variant="borderless"
          style={{ borderRadius: 20 }}
          loading={loading}
        >
          <Space direction="vertical" size={6}>
            <Text type="secondary">
              {intl.formatMessage({ id: 'account.settings.email' })}
            </Text>
            <Text strong>
              <MailOutlined style={{ marginRight: 6 }} />
              {email || '-'}
            </Text>
          </Space>
        </Card>

        <Card
          title={intl.formatMessage({ id: 'account.settings.password.title' })}
          variant="borderless"
          style={{ borderRadius: 20 }}
          loading={loading}
        >
          <Form layout="vertical" form={form} onFinish={handlePasswordChange}>
            <Form.Item
              label={intl.formatMessage({
                id: 'account.settings.password.current',
              })}
              name="current_password"
              rules={[
                {
                  required: true,
                  message: intl.formatMessage({
                    id: 'account.settings.password.current.required',
                  }),
                },
              ]}
            >
              <Input.Password prefix={<LockOutlined />} />
            </Form.Item>
            <Form.Item
              label={intl.formatMessage({
                id: 'account.settings.password.new',
              })}
              name="new_password"
              rules={[
                {
                  required: true,
                  message: intl.formatMessage({
                    id: 'account.settings.password.new.required',
                  }),
                },
              ]}
            >
              <Input.Password prefix={<LockOutlined />} />
            </Form.Item>
            <Form.Item
              label={intl.formatMessage({
                id: 'account.settings.password.confirm',
              })}
              name="confirm_password"
              dependencies={['new_password']}
              rules={[
                {
                  required: true,
                  message: intl.formatMessage({
                    id: 'account.settings.password.confirm.required',
                  }),
                },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('new_password') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(
                      new Error(
                        intl.formatMessage({
                          id: 'account.settings.password.confirm.mismatch',
                        }),
                      ),
                    );
                  },
                }),
              ]}
            >
              <Input.Password prefix={<LockOutlined />} />
            </Form.Item>

            <Button type="primary" htmlType="submit" loading={saving}>
              {intl.formatMessage({ id: 'account.settings.password.save' })}
            </Button>
          </Form>
        </Card>
      </Space>
    </PageContainer>
  );
}
