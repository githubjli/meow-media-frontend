import PageIntroCard from '@/components/PageIntroCard';
import VideoCard from '@/components/VideoCard';
import { listPublicVideos, type PublicVideo } from '@/services/publicVideos';
import { getLocalizedCategoryLabel } from '@/utils/categoryI18n';
import { PageContainer } from '@ant-design/pro-components';
import { useIntl, useModel, useSearchParams } from '@umijs/max';
import {
  Alert,
  Col,
  Empty,
  Input,
  Pagination,
  Row,
  Select,
  Space,
  Spin,
} from 'antd';
import { useEffect, useMemo, useState } from 'react';
const PAGE_SIZE = 12;

const toCardData = (video: PublicVideo) => ({
  ...video,
  routePath: `/browse/${video.id}`,
  name: video.title,
  author: video.owner_name || video.author,
  date: video.created_at,
  views: video.views || video.view_count,
  thumbnail: video.thumbnail,
  thumbnail_url: video.thumbnail_url,
  description: video.description,
  description_preview: video.description_preview || video.description,
  category_display: video.category_name || video.category_display,
  category_name: video.category_name || video.category_display,
});

export default function BrowsePage() {
  const intl = useIntl();
  const { initialState } = useModel('@@initialState');
  const isDark = Boolean(initialState?.darkTheme);
  const categories = initialState?.publicCategories || [];
  const [searchParams, setSearchParams] = useSearchParams();
  const [videos, setVideos] = useState<PublicVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [count, setCount] = useState(0);
  const [searchDraft, setSearchDraft] = useState(
    searchParams.get('search') || '',
  );

  const page = Number(searchParams.get('page') || '1');
  const search = searchParams.get('search') || '';
  const category = searchParams.get('category') || '';
  const ordering = searchParams.get('ordering') || '-created_at';
  const orderOptions = [
    {
      label: intl.formatMessage({ id: 'browse.order.latest' }),
      value: '-created_at',
    },
    {
      label: intl.formatMessage({ id: 'browse.order.oldest' }),
      value: 'created_at',
    },
    { label: intl.formatMessage({ id: 'browse.order.az' }), value: 'title' },
    { label: intl.formatMessage({ id: 'browse.order.za' }), value: '-title' },
  ];

  useEffect(() => {
    setSearchDraft(search);
  }, [search]);

  useEffect(() => {
    setLoading(true);
    setErrorMessage('');

    listPublicVideos({
      search,
      category,
      ordering,
      page,
      page_size: PAGE_SIZE,
    })
      .then((response) => {
        setVideos(response.results);
        setCount(response.count);
      })
      .catch((error: any) => {
        setErrorMessage(
          error?.message || intl.formatMessage({ id: 'browse.error' }),
        );
        setVideos([]);
        setCount(0);
      })
      .finally(() => setLoading(false));
  }, [search, category, ordering, page, intl]);

  const updateQuery = (next: Record<string, string | number | undefined>) => {
    const merged = new URLSearchParams(searchParams);
    Object.entries(next).forEach(([key, value]) => {
      if (value === undefined || value === '') {
        merged.delete(key);
      } else {
        merged.set(key, String(value));
      }
    });
    if (!next.page) {
      merged.set('page', '1');
    }
    setSearchParams(merged);
  };

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(count / PAGE_SIZE)),
    [count],
  );
  const categoryOptions = categories.map((item) => ({
    label: getLocalizedCategoryLabel(intl, item),
    value: item.slug,
  }));

  return (
    <PageContainer title={false}>
      <div style={{ padding: '8px 8px 20px' }}>
        <PageIntroCard
          title={intl.formatMessage({ id: 'browse.title' })}
          description={intl.formatMessage({ id: 'browse.subtitle' })}
        >
          <Space
            wrap
            size={[8, 8]}
            style={{
              width: '100%',
              padding: 8,
              borderRadius: 12,
              background: isDark
                ? 'rgba(255,255,255,0.04)'
                : 'rgba(15, 23, 42, 0.03)',
              border: isDark
                ? '1px solid rgba(255,255,255,0.08)'
                : '1px solid rgba(15, 23, 42, 0.05)',
            }}
          >
            <Input.Search
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
              onSearch={(value) => updateQuery({ search: value, page: 1 })}
              placeholder={intl.formatMessage({
                id: 'browse.search.placeholder',
              })}
              allowClear
              className="browse-search-input"
              style={{ minWidth: 220, flex: 1 }}
            />
            <Select
              allowClear
              placeholder={intl.formatMessage({
                id: 'browse.category.placeholder',
              })}
              value={category || undefined}
              style={{ minWidth: 160 }}
              options={categoryOptions}
              onChange={(value) => updateQuery({ category: value, page: 1 })}
            />
            <Select
              value={ordering}
              style={{ minWidth: 160 }}
              options={orderOptions}
              onChange={(value) => updateQuery({ ordering: value, page: 1 })}
            />
          </Space>
        </PageIntroCard>

        {errorMessage ? (
          <Alert
            type="error"
            showIcon
            message={errorMessage}
            style={{ marginBottom: 16 }}
          />
        ) : null}

        {loading ? (
          <div style={{ padding: '40px 0', textAlign: 'center' }}>
            <Spin />
          </div>
        ) : videos.length === 0 ? (
          <Empty description={intl.formatMessage({ id: 'browse.empty' })} />
        ) : (
          <>
            <Row gutter={[9, 11]}>
              {videos.map((video) => (
                <Col xs={24} sm={12} md={8} lg={6} xl={6} key={video.id}>
                  <VideoCard data={toCardData(video)} />
                </Col>
              ))}
            </Row>
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                marginTop: 20,
              }}
            >
              <Pagination
                current={page}
                pageSize={PAGE_SIZE}
                total={count}
                showSizeChanger={false}
                onChange={(nextPage) => updateQuery({ page: nextPage })}
              />
            </div>
            <span
              style={{
                display: 'block',
                marginTop: 6,
                color: 'rgba(0, 0, 0, 0.45)',
              }}
            >
              {intl.formatMessage(
                { id: 'common.pageOf' },
                { page, total: totalPages },
              )}
            </span>
          </>
        )}
      </div>
    </PageContainer>
  );
}
