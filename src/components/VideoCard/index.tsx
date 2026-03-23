import { CheckCircleFilled } from '@ant-design/icons';
import { history } from '@umijs/max';
import { Avatar, Tag, Typography } from 'antd';

const { Text, Title, Paragraph } = Typography;

const formatRelativeTime = (value: any) => {
  if (!value) {
    return 'Recently added';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return String(value);
  }

  const diffMs = Date.now() - parsed.getTime();
  const diffMinutes = Math.max(1, Math.floor(diffMs / 60000));
  if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) {
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  }

  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) {
    return `${diffMonths} month${diffMonths === 1 ? '' : 's'} ago`;
  }

  const diffYears = Math.floor(diffMonths / 12);
  return `${diffYears} year${diffYears === 1 ? '' : 's'} ago`;
};

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
  const publishedLabel = formatRelativeTime(data.created_at || data.date);
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
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
      }}
      onMouseEnter={(event) => {
        event.currentTarget.style.transform = 'translateY(-4px)';
        event.currentTarget.style.boxShadow =
          '0 18px 30px rgba(15, 23, 42, 0.10)';
        const image = event.currentTarget.querySelector('img');
        if (image) {
          (image as HTMLImageElement).style.transform = 'scale(1.03)';
        }
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.transform = 'translateY(0)';
        event.currentTarget.style.boxShadow = 'none';
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
          marginBottom: 6,
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
            transition: 'transform 0.2s ease',
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
          <Text
            type="secondary"
            style={{
              display: 'block',
              marginBottom: 4,
              fontSize: 10.5,
              lineHeight: 1.3,
              letterSpacing: '0.02em',
              textTransform: 'uppercase',
            }}
            ellipsis
          >
            {categoryLabel}
          </Text>
        ) : null}
        <Title
          level={5}
          style={{
            margin: '0 0 1px',
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
            style={{ margin: '0 0 3px', fontSize: 11.5, lineHeight: 1.48 }}
          >
            {description}
          </Paragraph>
        ) : null}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            minWidth: 0,
          }}
        >
          <Avatar
            src={`https://api.dicebear.com/7.x/identicon/svg?seed=${uploaderLabel}`}
            size={28}
            style={{ flexShrink: 0 }}
          />
          <Text
            type="secondary"
            style={{
              fontSize: 11.5,
              lineHeight: 1.45,
              flex: 1,
              minWidth: 0,
              display: 'block',
            }}
            ellipsis
          >
            {metaLine}
          </Text>
          <CheckCircleFilled
            style={{ color: '#35b8be', fontSize: 10, flexShrink: 0 }}
          />
        </div>
      </div>
    </div>
  );
};
