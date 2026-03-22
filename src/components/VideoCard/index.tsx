import { CheckCircleFilled } from '@ant-design/icons';
import { history } from '@umijs/max';
import { Avatar, Space, Tag, Typography } from 'antd';

const { Text, Title, Paragraph } = Typography;

const formatDuration = (value: any) => {
  if (!value && value !== 0) {
    return '8:24';
  }

  if (typeof value === 'string') {
    return value;
  }

  const totalSeconds = Number(value);
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) {
    return '8:24';
  }

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(
      seconds,
    ).padStart(2, '0')}`;
  }

  return `${minutes}:${String(seconds).padStart(2, '0')}`;
};

export default ({ data }: { data: any }) => {
  const title = data.title || data.name;
  const description = data.description_preview || data.description;
  const uploaderLabel = data.author || data.owner_name || 'Media Stream';
  const publishedLabel = data.created_at || data.date || 'Recently added';
  const viewsLabel = data.views || data.view_count;
  const categoryLabel = data.category_name || data.category_display;
  const durationLabel = formatDuration(
    data.duration_display || data.duration || data.length_seconds,
  );
  const metaLine = [uploaderLabel, publishedLabel, viewsLabel]
    .filter(Boolean)
    .join(' • ');

  return (
    <div
      onClick={() => history.push(data.routePath || `/room/${data.streamId}`)}
      style={{
        cursor: 'pointer',
        borderRadius: 12,
        padding: 6,
        transition:
          'transform 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease',
      }}
      onMouseEnter={(event) => {
        event.currentTarget.style.transform = 'translateY(-2px)';
        event.currentTarget.style.boxShadow =
          '0 16px 28px rgba(15, 23, 42, 0.10)';
        event.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.62)';
        const image = event.currentTarget.querySelector('img');
        if (image) {
          (image as HTMLImageElement).style.transform = 'scale(1.04)';
        }
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.transform = 'translateY(0)';
        event.currentTarget.style.boxShadow = 'none';
        event.currentTarget.style.backgroundColor = 'transparent';
        const image = event.currentTarget.querySelector('img');
        if (image) {
          (image as HTMLImageElement).style.transform = 'scale(1)';
        }
      }}
    >
      <div
        style={{
          position: 'relative',
          borderRadius: 12,
          overflow: 'hidden',
          aspectRatio: '16/9',
          marginBottom: 8,
          background: '#0f172a',
        }}
      >
        <img
          src={
            data.thumbnail_url ||
            data.thumbnail ||
            `https://picsum.photos/seed/${data.id || data.streamId}/640/360`
          }
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
            transition: 'transform 0.3s ease',
          }}
        />
        {data.status === 'broadcasting' && (
          <Tag
            color="red"
            style={{
              position: 'absolute',
              top: 10,
              left: 10,
              border: 'none',
              fontWeight: 700,
              borderRadius: 999,
              paddingInline: 8,
            }}
          >
            LIVE
          </Tag>
        )}
        <div
          style={{
            position: 'absolute',
            right: 8,
            bottom: 8,
            borderRadius: 8,
            padding: '2px 6px',
            background: 'rgba(15, 23, 42, 0.78)',
            color: '#f8fafc',
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.01em',
          }}
        >
          {durationLabel}
        </div>
      </div>
      <div style={{ minWidth: 0 }}>
        {categoryLabel ? (
          <Tag
            bordered={false}
            style={{
              margin: '0 0 5px',
              borderRadius: 999,
              background: 'rgba(15, 23, 42, 0.05)',
              color: '#667085',
              paddingInline: 8,
            }}
          >
            {categoryLabel}
          </Tag>
        ) : null}
        <Title
          level={5}
          style={{
            margin: '0 0 3px',
            fontSize: 14,
            lineHeight: 1.4,
            fontWeight: 700,
          }}
          ellipsis={{ rows: 2 }}
        >
          {title}
        </Title>
        {description ? (
          <Paragraph
            type="secondary"
            ellipsis={{ rows: 2 }}
            style={{ margin: '0 0 5px', fontSize: 12, lineHeight: 1.5 }}
          >
            {description}
          </Paragraph>
        ) : null}
        <Space align="center" size={7} style={{ width: '100%' }}>
          <Avatar
            src={`https://api.dicebear.com/7.x/identicon/svg?seed=${uploaderLabel}`}
            size={28}
          />
          <Text
            type="secondary"
            style={{ fontSize: 11.5, lineHeight: 1.45, flex: 1, minWidth: 0 }}
            ellipsis
          >
            {metaLine}
          </Text>
          <CheckCircleFilled
            style={{ color: '#35b8be', fontSize: 10, flexShrink: 0 }}
          />
        </Space>
      </div>
    </div>
  );
};
