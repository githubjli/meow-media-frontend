import { CheckCircleFilled } from '@ant-design/icons';
import { history, useIntl, useModel } from '@umijs/max';
import { Avatar, Tag, Typography } from 'antd';

const { Text, Title, Paragraph } = Typography;

const formatRelativeTime = (value: any, intl: any) => {
  if (!value) {
    return intl.formatMessage({ id: 'videoCard.recentlyAdded' });
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return String(value);
  }

  const diffMs = Date.now() - parsed.getTime();
  if (diffMs < 60000) {
    return intl.formatMessage({ id: 'videoCard.justNow' });
  }
  const diffMinutes = Math.max(1, Math.floor(diffMs / 60000));
  if (diffMinutes < 60) {
    return intl.formatMessage(
      {
        id:
          diffMinutes === 1
            ? 'videoCard.time.minute'
            : 'videoCard.time.minutes',
      },
      { count: diffMinutes },
    );
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return intl.formatMessage(
      {
        id: diffHours === 1 ? 'videoCard.time.hour' : 'videoCard.time.hours',
      },
      { count: diffHours },
    );
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) {
    return intl.formatMessage(
      {
        id: diffDays === 1 ? 'videoCard.time.day' : 'videoCard.time.days',
      },
      { count: diffDays },
    );
  }

  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) {
    return intl.formatMessage(
      {
        id: diffMonths === 1 ? 'videoCard.time.month' : 'videoCard.time.months',
      },
      { count: diffMonths },
    );
  }

  const diffYears = Math.floor(diffMonths / 12);
  return intl.formatMessage(
    {
      id: diffYears === 1 ? 'videoCard.time.year' : 'videoCard.time.years',
    },
    { count: diffYears },
  );
};

const normalizeCardStatus = (value?: any) => {
  const status = String(value || '')
    .toLowerCase()
    .trim();

  if (['live', 'started', 'broadcasting', 'publishing'].includes(status)) {
    return 'live';
  }

  if (['ready', 'created', 'prepared', 'not_started'].includes(status)) {
    return 'ready';
  }

  if (['ended', 'finished', 'completed', 'stopped'].includes(status)) {
    return 'ended';
  }

  if (
    ['waiting', 'waiting_for_signal', 'pending', 'starting'].includes(status)
  ) {
    return 'waiting_for_signal';
  }

  return '';
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
  const intl = useIntl();
  const { initialState } = useModel('@@initialState');
  const isDark = Boolean(initialState?.darkTheme);
  const title = data.title || data.name;
  const description =
    data.status_description || data.description_preview || data.description;
  const normalizedTitle = String(title || '')
    .trim()
    .toLowerCase();
  const normalizedDescription = String(description || '')
    .trim()
    .toLowerCase();
  const shouldShowDescription = Boolean(
    normalizedDescription && normalizedDescription !== normalizedTitle,
  );
  const uploaderLabel =
    data.author ||
    data.owner_name ||
    intl.formatMessage({ id: 'app.user.uploaderFallback' });
  const publishedLabel = formatRelativeTime(data.created_at || data.date, intl);
  const viewsLabel = data.views || data.view_count;
  const categoryLabel = data.category_name || data.category_display;
  const durationLabel = formatDuration(
    data.duration_display || data.duration || data.length_seconds,
  );
  const metaLine = [uploaderLabel, publishedLabel, viewsLabel]
    .filter(Boolean)
    .join(' • ');
  const cardBackground = isDark ? '#302A24' : '#fffaf2';
  const cardBorder = isDark
    ? '1px solid rgba(255,255,255,0.06)'
    : '1px solid transparent';
  const titleColor = isDark ? '#F5F1EA' : '#2c2c2c';
  const descriptionColor = isDark ? '#CBBBAA' : '#745f40';
  const metaColor = isDark ? '#CBBBAA' : '#948261';
  const thumbBackground = isDark ? '#211c18' : '#2c2c2c';
  const normalizedStatus = normalizeCardStatus(
    data.normalized_status || data.status,
  );
  const isLive = normalizedStatus === 'live';
  const isEnded = normalizedStatus === 'ended';
  const isStarting = normalizedStatus === 'waiting_for_signal';
  const isReady = normalizedStatus === 'ready';

  const statusLabel = data.status_label
    ? String(data.status_label)
    : isLive
    ? intl.formatMessage({ id: 'videoCard.live' })
    : isStarting
    ? intl.formatMessage({ id: 'live.status.starting' })
    : isReady
    ? intl.formatMessage({ id: 'live.status.notStarted' })
    : isEnded
    ? intl.formatMessage({ id: 'live.status.ended' })
    : '';

  return (
    <div
      onClick={() => history.push(data.routePath || `/room/${data.streamId}`)}
      style={{
        cursor: 'pointer',
        borderRadius: 14,
        padding: 6,
        border: cardBorder,
        background: cardBackground,
        transition:
          'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease, background-color 0.2s ease',
        opacity: isEnded ? 0.74 : 1,
      }}
      onMouseEnter={(event) => {
        event.currentTarget.style.transform = 'translateY(-2px)';
        event.currentTarget.style.borderColor = isDark
          ? 'rgba(255,255,255,0.1)'
          : 'rgba(184, 135, 46, 0.1)';
        event.currentTarget.style.background = isDark ? '#342E28' : '#fff9ef';
        event.currentTarget.style.boxShadow = isDark
          ? '0 10px 20px rgba(0, 0, 0, 0.24)'
          : '0 6px 14px rgba(116, 95, 64, 0.08)';
        const image = event.currentTarget.querySelector('img');
        if (image) {
          (image as HTMLImageElement).style.transform = 'scale(1.015)';
        }
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.transform = 'translateY(0)';
        event.currentTarget.style.borderColor = isDark
          ? 'rgba(255,255,255,0.06)'
          : 'transparent';
        event.currentTarget.style.background = isDark ? '#302A24' : '#fffaf2';
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
          marginBottom: 7,
          background: thumbBackground,
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
        {statusLabel ? (
          <Tag
            color={isLive ? 'red' : isEnded ? 'default' : 'default'}
            style={{
              position: 'absolute',
              top: 10,
              left: 10,
              border: 'none',
              fontWeight: 700,
              borderRadius: 999,
              paddingInline: 8,
              opacity: isLive ? 1 : 0.85,
            }}
          >
            {statusLabel}
          </Tag>
        ) : null}
        <div
          style={{
            position: 'absolute',
            right: 8,
            bottom: 8,
            borderRadius: 8,
            padding: '2px 6px',
            background: isDark
              ? 'rgba(0, 0, 0, 0.5)'
              : 'rgba(15, 23, 42, 0.78)',
            color: '#fffaf0',
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
              color: metaColor,
            }}
            ellipsis
          >
            {categoryLabel}
          </Text>
        ) : null}
        <div
          style={{ display: 'flex', flexDirection: 'column', minHeight: 96 }}
        >
          <Title
            level={5}
            style={{
              margin: '0 0 1px',
              fontSize: 14,
              lineHeight: 1.38,
              fontWeight: 700,
              color: titleColor,
            }}
            ellipsis={{ rows: 2 }}
          >
            {title}
          </Title>
          {shouldShowDescription ? (
            <Paragraph
              type="secondary"
              ellipsis={{ rows: 2 }}
              style={{
                margin: '0 0 6px',
                fontSize: 11,
                lineHeight: 1.5,
                color: descriptionColor,
              }}
            >
              {description}
            </Paragraph>
          ) : null}
          <div style={{ flex: 1 }} />
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
                fontSize: 11,
                lineHeight: 1.45,
                flex: 1,
                minWidth: 0,
                display: 'block',
                color: metaColor,
              }}
              ellipsis
            >
              {metaLine}
            </Text>
            <CheckCircleFilled
              style={{
                color: isDark ? '#EFBC5C' : '#b8872e',
                fontSize: 10,
                flexShrink: 0,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
