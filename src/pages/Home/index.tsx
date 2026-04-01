import VideoCard from '@/components/VideoCard';
import { type PublicCategory } from '@/services/publicCategories';
import { listPublicVideos, type PublicVideo } from '@/services/publicVideos';
import {
  getCanonicalCategorySlug,
  getLocalizedCategoryLabel,
} from '@/utils/categoryI18n';
import { AppstoreOutlined, RightOutlined } from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { history, useIntl, useModel } from '@umijs/max';
import { Alert, Button, Card, Col, Empty, Row, Spin, Typography } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import styles from './index.less';

const { Title, Text } = Typography;
const SECTION_SIZE = 4;
const PRIMARY_CATEGORY_ORDER = ['technology', 'gaming', 'news', 'education'];

const dedupeCategories = (items: PublicCategory[]) => {
  const categoryMap = new Map<string, PublicCategory>();

  items.forEach((category) => {
    const canonicalSlug = getCanonicalCategorySlug(category.slug);
    const existing = categoryMap.get(canonicalSlug);

    if (!existing || category.slug === canonicalSlug) {
      categoryMap.set(canonicalSlug, {
        ...category,
        slug: canonicalSlug,
        name: category.name,
      });
    }
  });

  return Array.from(categoryMap.values());
};

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

const TagsBar = ({ tags, intl }: { tags: PublicCategory[]; intl: any }) => (
  <div className={styles.tagsWrap}>
    <div className={styles.tagsBar}>
      <button
        type="button"
        onClick={() => history.push('/browse')}
        className={styles.tagChip}
      >
        {intl.formatMessage({ id: 'common.allVideos' })}
      </button>
      {tags.map((tag) => (
        <button
          key={tag.slug}
          type="button"
          onClick={() => history.push(`/categories/${tag.slug}`)}
          className={styles.tagChip}
        >
          {getLocalizedCategoryLabel(intl, tag)}
        </button>
      ))}
    </div>
  </div>
);

const ChannelRow = ({ title, path, items, description, intl }: any) => (
  <section className={styles.sectionBlock}>
    <div className={styles.sectionHeader}>
      <div className={styles.sectionTitleWrap}>
        <span className={styles.sectionIcon}>
          <AppstoreOutlined />
        </span>
        <div>
          <Title level={3} className={styles.sectionTitle}>
            {title}
          </Title>
          <Text className={styles.sectionDescription}>{description}</Text>
        </div>
      </div>
      <Button
        type="link"
        onClick={() => history.push(path)}
        className={styles.sectionAction}
      >
        {intl.formatMessage({ id: 'common.showMore' })}{' '}
        <RightOutlined style={{ fontSize: 10 }} />
      </Button>
    </div>

    {items.length === 0 ? (
      <Empty
        description={intl.formatMessage(
          { id: 'common.noVideosInSection' },
          { section: title },
        )}
      />
    ) : (
      <Row gutter={[10, 12]}>
        {items.map((item: PublicVideo) => (
          <Col xs={24} sm={12} md={8} lg={6} xl={6} key={item.id}>
            <VideoCard data={toCardData(item)} />
          </Col>
        ))}
      </Row>
    )}
  </section>
);

export default function HomePage() {
  const intl = useIntl();
  const { initialState } = useModel('@@initialState');
  const rawCategories = initialState?.publicCategories || [];
  const categories = useMemo(
    () => dedupeCategories(rawCategories),
    [rawCategories],
  );
  const [latestVideos, setLatestVideos] = useState<PublicVideo[]>([]);
  const [sectionVideos, setSectionVideos] = useState<
    Record<string, PublicVideo[]>
  >({});
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const homepageCategories = useMemo(() => {
    const categoryMap = new Map(
      categories.map((category) => [category.slug, category]),
    );
    return PRIMARY_CATEGORY_ORDER.map((slug) => categoryMap.get(slug)).filter(
      Boolean,
    ) as PublicCategory[];
  }, [categories]);

  useEffect(() => {
    let active = true;

    const loadHomeData = async () => {
      setLoading(true);
      setErrorMessage('');

      try {
        const [latestResponse, ...sectionResponses] = await Promise.all([
          listPublicVideos({
            ordering: '-created_at',
            page_size: SECTION_SIZE,
          }),
          ...homepageCategories.map((category) =>
            listPublicVideos({
              category: category.slug,
              ordering: '-created_at',
              page_size: SECTION_SIZE,
            }),
          ),
        ]);

        if (!active) {
          return;
        }

        setLatestVideos(latestResponse.results.slice(0, SECTION_SIZE));
        setSectionVideos(
          homepageCategories.reduce<Record<string, PublicVideo[]>>(
            (acc, category, index) => {
              acc[category.slug] = sectionResponses[index]?.results || [];
              return acc;
            },
            {},
          ),
        );
      } catch (error: any) {
        if (active) {
          setErrorMessage(
            error?.message || intl.formatMessage({ id: 'home.error' }),
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadHomeData();

    return () => {
      active = false;
    };
  }, [homepageCategories, intl]);

  return (
    <PageContainer title={false} ghost contentWidth="Fluid">
      <div className={styles.pageShell}>
        <Card variant="borderless" className={styles.heroCard}>
          <div className={styles.heroHeader}>
            <div>
              <Text className={styles.heroEyebrow}>
                {intl.formatMessage({ id: 'home.hero.eyebrow' })}
              </Text>
              <Title level={2} className={styles.heroTitle}>
                {intl.formatMessage({ id: 'home.hero.title' })}
              </Title>
              <Text className={styles.heroDescription}>
                {intl.formatMessage({ id: 'home.hero.description' })}
              </Text>
            </div>
          </div>
          <TagsBar tags={homepageCategories} intl={intl} />
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
        ) : (
          <>
            <ChannelRow
              title={intl.formatMessage({ id: 'common.latest' })}
              path="/browse"
              description={intl.formatMessage({
                id: 'home.latest.description',
              })}
              items={latestVideos}
              intl={intl}
            />
            {homepageCategories.map((section) => {
              const localizedCategoryLabel = getLocalizedCategoryLabel(
                intl,
                section,
              );
              return (
                <ChannelRow
                  key={section.slug}
                  title={localizedCategoryLabel}
                  path={`/categories/${section.slug}`}
                  description={intl.formatMessage(
                    { id: 'home.category.description' },
                    { category: localizedCategoryLabel },
                  )}
                  items={sectionVideos[section.slug] || []}
                  intl={intl}
                />
              );
            })}
          </>
        )}
      </div>
    </PageContainer>
  );
}
