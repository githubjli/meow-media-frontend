import { deleteCreatorDrama, getCreatorDramas } from '@/services/drama';
import type { DramaSeries } from '@/types/drama';
import { PageContainer } from '@ant-design/pro-components';
import { history, useIntl, useLocation, useModel } from '@umijs/max';
import {
  Alert,
  Button,
  Card,
  Empty,
  Image,
  Popconfirm,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useEffect, useMemo, useState } from 'react';

const { Text, Title } = Typography;

const formatDate = (value?: string) => {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
};

const resolveTotalEpisodes = (item: DramaSeries) =>
  Number(item.total_episodes ?? item.episodes_count ?? 0);

const resolveViews = (item: DramaSeries) => Number(item.view_count ?? 0);

const resolveFavorites = (item: DramaSeries) =>
  Number(item.favorite_count ?? 0);

export default function CreatorDramaListPage() {
  const intl = useIntl();
  const location = useLocation();
  const { initialState } = useModel('@@initialState');
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [items, setItems] = useState<DramaSeries[]>([]);

  const isLoggedIn = Boolean(initialState?.currentUser?.email);
  const isCreator = Boolean(
    initialState?.currentUser &&
      (initialState.currentUser.is_creator ||
        initialState.currentUser.role === 'creator' ||
        initialState.currentUser.user_type === 'creator'),
  );

  const loadList = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const response = await getCreatorDramas();
      setItems(response.results || []);
    } catch (error: any) {
      setErrorMessage(
        error?.message ||
          intl.formatMessage({ id: 'drama.creator.list.error.load' }),
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isLoggedIn) {
      history.push(`/login?redirect=${encodeURIComponent(location.pathname)}`);
      return;
    }

    if (!isCreator) {
      setLoading(false);
      return;
    }

    loadList();
  }, [intl, isCreator, isLoggedIn, location.pathname]);

  const columns: ColumnsType<DramaSeries> = useMemo(
    () => [
      {
        title: intl.formatMessage({ id: 'drama.creator.fields.cover' }),
        dataIndex: 'cover_url',
        key: 'cover_url',
        width: 120,
        render: (_: string, item) => {
          const cover = item.cover_url || item.cover || item.thumbnail_url;
          return cover ? (
            <Image
              src={cover}
              width={88}
              height={50}
              style={{ objectFit: 'cover', borderRadius: 8 }}
              preview={false}
            />
          ) : (
            <div
              style={{
                width: 88,
                height: 50,
                borderRadius: 8,
                background: '#f3eee4',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#948261',
                fontSize: 11,
              }}
            >
              {item.title?.charAt(0) || '#'}
            </div>
          );
        },
      },
      {
        title: intl.formatMessage({ id: 'drama.creator.fields.title' }),
        dataIndex: 'title',
        key: 'title',
      },
      {
        title: intl.formatMessage({ id: 'drama.creator.fields.status' }),
        dataIndex: 'status',
        key: 'status',
        render: (value: string) => (
          <Tag>
            {intl.formatMessage({
              id: `drama.creator.status.${value || 'draft'}`,
            })}
          </Tag>
        ),
      },
      {
        title: intl.formatMessage({ id: 'drama.creator.fields.visibility' }),
        dataIndex: 'visibility',
        key: 'visibility',
        render: (value: string) => (
          <Tag>
            {intl.formatMessage({
              id: `drama.creator.visibility.${value || 'public'}`,
            })}
          </Tag>
        ),
      },
      {
        title: intl.formatMessage({ id: 'drama.creator.fields.totalEpisodes' }),
        key: 'episodes',
        render: (_, item) => resolveTotalEpisodes(item),
      },
      {
        title: intl.formatMessage({ id: 'drama.creator.fields.views' }),
        key: 'views',
        render: (_, item) => resolveViews(item),
      },
      {
        title: intl.formatMessage({ id: 'drama.creator.fields.favorites' }),
        key: 'favorites',
        render: (_, item) => resolveFavorites(item),
      },
      {
        title: intl.formatMessage({ id: 'drama.creator.fields.updatedAt' }),
        dataIndex: 'updated_at',
        key: 'updated_at',
        render: (value: string) => formatDate(value),
      },
      {
        title: intl.formatMessage({ id: 'drama.creator.actions.column' }),
        key: 'actions',
        width: 280,
        render: (_, item) => (
          <Space wrap>
            <Button
              type="link"
              onClick={() => history.push(`/creator/dramas/${item.id}/edit`)}
            >
              {intl.formatMessage({ id: 'drama.creator.actions.edit' })}
            </Button>
            <Button
              type="link"
              onClick={() =>
                history.push(`/creator/dramas/${item.id}/episodes`)
              }
            >
              {intl.formatMessage({ id: 'drama.creator.actions.episodes' })}
            </Button>
            <Button
              type="link"
              onClick={() => history.push(`/drama/${item.id}`)}
            >
              {intl.formatMessage({ id: 'drama.creator.actions.preview' })}
            </Button>
            <Popconfirm
              title={intl.formatMessage({ id: 'drama.creator.actions.delete' })}
              okText={intl.formatMessage({ id: 'common.yes' })}
              cancelText={intl.formatMessage({ id: 'common.cancel' })}
              onConfirm={async () => {
                try {
                  await deleteCreatorDrama(item.id);
                  message.success(
                    intl.formatMessage({ id: 'drama.creator.delete.success' }),
                  );
                  setItems((prev) =>
                    prev.filter((entry) => entry.id !== item.id),
                  );
                } catch (error: any) {
                  if (error?.status === 404 || error?.status === 405) {
                    message.warning(
                      intl.formatMessage({
                        id: 'drama.creator.delete.unsupported',
                      }),
                    );
                    return;
                  }
                  message.error(
                    error?.message ||
                      intl.formatMessage({ id: 'drama.creator.delete.failed' }),
                  );
                }
              }}
            >
              <Button type="link" danger>
                {intl.formatMessage({ id: 'drama.creator.actions.delete' })}
              </Button>
            </Popconfirm>
          </Space>
        ),
      },
    ],
    [intl],
  );

  return (
    <PageContainer title={false}>
      <div style={{ maxWidth: 1240, margin: '0 auto', padding: '8px 0 24px' }}>
        <Card variant="borderless" style={{ borderRadius: 20 }}>
          <Space
            align="start"
            style={{ width: '100%', justifyContent: 'space-between' }}
            wrap
          >
            <div>
              <Title level={3} style={{ marginBottom: 4 }}>
                {intl.formatMessage({ id: 'drama.creator.list.title' })}
              </Title>
              <Text type="secondary">
                {intl.formatMessage({ id: 'drama.creator.list.subtitle' })}
              </Text>
            </div>
            <Button
              type="primary"
              onClick={() => history.push('/creator/dramas/new')}
              disabled={!isCreator}
            >
              {intl.formatMessage({ id: 'drama.creator.actions.createDrama' })}
            </Button>
          </Space>
        </Card>

        <div style={{ marginTop: 14 }}>
          {!isCreator ? (
            <Card variant="borderless" style={{ borderRadius: 20 }}>
              <Empty
                description={intl.formatMessage({
                  id: 'drama.creator.permissionDenied',
                })}
              >
                <Button onClick={() => history.push('/home')}>
                  {intl.formatMessage({ id: 'nav.home' })}
                </Button>
              </Empty>
            </Card>
          ) : loading ? (
            <Card loading variant="borderless" style={{ borderRadius: 20 }} />
          ) : errorMessage ? (
            <Alert
              type="error"
              showIcon
              message={errorMessage}
              action={
                <Button size="small" onClick={loadList}>
                  {intl.formatMessage({ id: 'common.refresh' })}
                </Button>
              }
            />
          ) : items.length === 0 ? (
            <Card variant="borderless" style={{ borderRadius: 20 }}>
              <Empty
                description={intl.formatMessage({
                  id: 'drama.creator.list.empty',
                })}
              >
                <Button
                  type="primary"
                  onClick={() => history.push('/creator/dramas/new')}
                >
                  {intl.formatMessage({
                    id: 'drama.creator.actions.createDrama',
                  })}
                </Button>
              </Empty>
            </Card>
          ) : (
            <Card variant="borderless" style={{ borderRadius: 20 }}>
              <Table<DramaSeries>
                rowKey={(row) => String(row.id)}
                columns={columns}
                dataSource={items}
                pagination={false}
                scroll={{ x: 980 }}
              />
            </Card>
          )}
        </div>
      </div>
    </PageContainer>
  );
}
