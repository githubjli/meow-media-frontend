import VideoCard from '@/components/VideoCard';
import { listPublicVideos, type PublicVideo } from '@/services/publicVideos';
import { PageContainer } from '@ant-design/pro-components';
import { history, useIntl, useModel, useParams } from '@umijs/max';
import {
  Alert,
  Button,
  Card,
  Col,
  Empty,
  Row,
  Space,
  Spin,
  Typography,
} from 'antd';
import { useEffect, useMemo, useState } from 'react';

const { Title, Text } = Typography;

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

export default function CategoryBrowsePage() {
  const { category } = useParams<{ category: string }>();
  const intl = useIntl();
  const { initialState } = useModel('@@initialState');
  const categories = initialState?.publicCategories || [];
  const [videos, setVideos] = useState<PublicVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!category) {
      return;
    }

    setLoading(true);
    setErrorMessage('');

    listPublicVideos({ category, ordering: '-created_at', page_size: 24 })
      .then((response) => setVideos(response.results))
      .catch((error: any) => {
        setErrorMessage(
          error?.message || intl.formatMessage({ id: 'categories.error' }),
        );
        setVideos([]);
      })
      .finally(() => setLoading(false));
  }, [category, intl]);

  const currentCategory = useMemo(
    () => categories.find((item) => item.slug === category),
    [categories, category],
  );
  const pageTitle =
    currentCategory?.name ||
    category ||
    intl.formatMessage({ id: 'categories.fallbackTitle' });

  return (
    <PageContainer title={false}>
      <div style={{ padding: '8px 8px 20px' }}>
        <Card
          variant="borderless"
          style={{ borderRadius: 16, marginBottom: 20 }}
        >
          <Space direction="vertical" size={8}>
            <Title level={2} style={{ margin: 0 }}>
              {pageTitle}
            </Title>
            <Text type="secondary">
              {intl.formatMessage({ id: 'categories.subtitle' })}
            </Text>
            <Button
              type="link"
              style={{ paddingInline: 0 }}
              onClick={() => history.push('/browse')}
            >
              {intl.formatMessage({ id: 'categories.backToAll' })}
            </Button>
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
          <Empty
            description={intl.formatMessage(
              { id: 'categories.empty' },
              { category: pageTitle },
            )}
          />
        ) : (
          <Row gutter={[12, 14]}>
            {videos.map((video) => (
              <Col xs={24} sm={12} md={8} lg={6} key={video.id}>
                <VideoCard data={toCardData(video)} />
              </Col>
            ))}
          </Row>
        )}
      </div>
    </PageContainer>
  );
}
