import { CheckCircleFilled } from '@ant-design/icons';
import { history } from '@umijs/max';
import { Avatar, Space, Tag, Typography } from 'antd';

const { Text, Title, Paragraph } = Typography;

export default ({ data }: { data: any }) => {
  const title = data.title || data.name;
  const description = data.description_preview || data.description;
  const uploaderLabel = data.author || data.owner_name || 'Media Stream';
  const publishedLabel = data.created_at || data.date || 'Recently added';
  const viewsLabel = data.views || data.view_count;
  const categoryLabel = data.category_name || data.category_display;
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
          '0 12px 24px rgba(15, 23, 42, 0.07)';
        event.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.62)';
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
          borderRadius: 12,
          overflow: 'hidden',
          aspectRatio: '16/9',
          marginBottom: 10,
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
      </div>
      <div style={{ minWidth: 0 }}>
        {categoryLabel ? (
          <Tag
            bordered={false}
            style={{
              margin: '0 0 6px',
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
          style={{ margin: '0 0 4px', fontSize: 14, lineHeight: 1.4 }}
          ellipsis={{ rows: 2 }}
        >
          {title}
        </Title>
        {description ? (
          <Paragraph
            type="secondary"
            ellipsis={{ rows: 2 }}
            style={{ margin: '0 0 6px', fontSize: 12, lineHeight: 1.55 }}
          >
            {description}
          </Paragraph>
        ) : null}
        <Space align="center" size={8} style={{ width: '100%' }}>
          <Avatar
            src={`https://api.dicebear.com/7.x/identicon/svg?seed=${uploaderLabel}`}
            size={28}
          />
          <Text
            type="secondary"
            style={{ fontSize: 11.5, lineHeight: 1.5 }}
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
