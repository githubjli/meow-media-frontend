import { CheckCircleFilled } from '@ant-design/icons';
import { history } from '@umijs/max';
import { Avatar, Space, Tag, Typography } from 'antd';

const { Text, Title, Paragraph } = Typography;

export default ({ data }: { data: any }) => {
  const title = data.title || data.name;
  const secondaryLabel = data.category_display || data.author || 'Media Stream';
  const metaLine = [
    data.category_display || data.views,
    data.created_at || data.date,
  ]
    .filter(Boolean)
    .join(' • ');

  return (
    <div
      onClick={() => history.push(data.routePath || `/room/${data.streamId}`)}
      style={{
        cursor: 'pointer',
        borderRadius: 16,
        padding: 8,
        transition:
          'transform 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease',
      }}
      onMouseEnter={(event) => {
        event.currentTarget.style.transform = 'translateY(-2px)';
        event.currentTarget.style.boxShadow =
          '0 12px 28px rgba(15, 23, 42, 0.10)';
        event.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.88)';
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.transform = 'translateY(0)';
        event.currentTarget.style.boxShadow = 'none';
        event.currentTarget.style.backgroundColor = 'transparent';
      }}
    >
      <div
        style={{
          position: 'relative',
          borderRadius: 16,
          overflow: 'hidden',
          aspectRatio: '16/9',
          marginBottom: 16,
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
          }}
        />
        {data.status === 'broadcasting' && (
          <Tag
            color="red"
            style={{
              position: 'absolute',
              top: 12,
              left: 12,
              border: 'none',
              fontWeight: 700,
              borderRadius: 999,
              paddingInline: 10,
            }}
          >
            LIVE
          </Tag>
        )}
      </div>
      <Space align="start" size={12} style={{ width: '100%' }}>
        <Avatar
          src={`https://api.dicebear.com/7.x/identicon/svg?seed=${secondaryLabel}`}
          size={40}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <Title
            level={5}
            style={{ margin: '0 0 6px', fontSize: 15, lineHeight: 1.45 }}
            ellipsis={{ rows: 2 }}
          >
            {title}
          </Title>
          <Text
            type="secondary"
            style={{
              fontSize: 13,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {secondaryLabel}{' '}
            <CheckCircleFilled style={{ color: '#5bd1d7', fontSize: 11 }} />
          </Text>
          {metaLine ? (
            <div style={{ marginTop: 4 }}>
              <Text type="secondary" style={{ fontSize: 12, lineHeight: 1.5 }}>
                {metaLine}
              </Text>
            </div>
          ) : null}
          {data.description ? (
            <Paragraph
              type="secondary"
              ellipsis={{ rows: 2 }}
              style={{ margin: '8px 0 0', fontSize: 12 }}
            >
              {data.description}
            </Paragraph>
          ) : null}
        </div>
      </Space>
    </div>
  );
};
