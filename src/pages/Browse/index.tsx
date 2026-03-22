import VideoCard from '@/components/VideoCard';
import { listPublicVideos, type PublicVideo } from '@/services/publicVideos';
import { PageContainer } from '@ant-design/pro-components';
import { useModel, useSearchParams } from '@umijs/max';
import {
  Alert,
  Card,
  Col,
  Empty,
  Input,
  Pagination,
  Row,
  Select,
  Space,
  Spin,
  Typography,
} from 'antd';
import { useEffect, useMemo, useState } from 'react';

const { Title, Text } = Typography;
const PAGE_SIZE = 12;

const ORDER_OPTIONS = [
  { label: 'Latest first', value: '-created_at' },
  { label: 'Oldest first', value: 'created_at' },
  { label: 'Title A-Z', value: 'title' },
  { label: 'Title Z-A', value: '-title' },
];

const toCardData = (video: PublicVideo) => ({
  ...video,
  routePath: `/browse/${video.id}`,
  name: video.title,
  author: video.owner_name || video.author || 'Media Stream',
  date: video.created_at || 'Recently added',
  views: video.views || video.view_count || 'Public',
  thumbnail: video.thumbnail,
  thumbnail_url: video.thumbnail_url,
  description: video.description,
  description_preview: video.description_preview || video.description,
  category_display: video.category_name || video.category_display,
  category_name: video.category_name || video.category_display,
});

export default function BrowsePage() {
  const { initialState } = useModel('@@initialState');
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
          error?.message || 'Unable to load public videos right now.',
        );
        setVideos([]);
        setCount(0);
      })
      .finally(() => setLoading(false));
  }, [search, category, ordering, page]);

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
    label: item.name,
    value: item.slug,
  }));

  return (
    <PageContainer title={false}>
      <div style={{ padding: '8px 8px 20px' }}>
        <Card
          bordered={false}
          style={{
            borderRadius: 16,
            marginBottom: 20,
            border: '1px solid rgba(15, 23, 42, 0.06)',
          }}
        >
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <div>
              <Title level={2} style={{ margin: 0, fontSize: 28 }}>
                Browse videos
              </Title>
              <Text type="secondary">
                Search the public catalog, filter by category, and sort by what
                matters most.
              </Text>
            </div>

            <Space
              wrap
              size={[10, 10]}
              style={{
                width: '100%',
                padding: 10,
                borderRadius: 14,
                background: 'rgba(15, 23, 42, 0.03)',
                border: '1px solid rgba(15, 23, 42, 0.05)',
              }}
            >
              <Input.Search
                value={searchDraft}
                onChange={(event) => setSearchDraft(event.target.value)}
                onSearch={(value) => updateQuery({ search: value, page: 1 })}
                placeholder="Search videos"
                allowClear
                size="large"
                style={{ minWidth: 240, flex: 1 }}
              />
              <Select
                allowClear
                placeholder="Category"
                value={category || undefined}
                size="large"
                style={{ minWidth: 170 }}
                options={categoryOptions}
                onChange={(value) => updateQuery({ category: value, page: 1 })}
              />
              <Select
                value={ordering}
                size="large"
                style={{ minWidth: 170 }}
                options={ORDER_OPTIONS}
                onChange={(value) => updateQuery({ ordering: value, page: 1 })}
              />
            </Space>
          </Space>
        </Card>

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
          <Empty description="No public videos matched your filters." />
        ) : (
          <>
            <Row gutter={[14, 18]}>
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
            <Text type="secondary" style={{ display: 'block', marginTop: 6 }}>
              Page {page} of {totalPages}
            </Text>
          </>
        )}
      </div>
    </PageContainer>
  );
}
