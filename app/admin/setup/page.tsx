export const metadata = {
  title: '后台配置说明',
};

const requiredVariables = [
  {
    name: 'DATABASE_URL',
    value: '${POSTGRES_CONNECTION_STRING}',
    note: '连接 Zeabur PostgreSQL。没有它，内容、AI 令牌和同步记录页面会报错。',
  },
  {
    name: 'AUTH_SECRET',
    value: '随机长密钥',
    note: 'NextAuth 用来签名登录会话。生产环境必须配置。',
  },
  {
    name: 'AUTH_GITHUB_ID',
    value: 'GitHub OAuth App 的 Client ID',
    note: '后台 GitHub 登录需要。',
  },
  {
    name: 'AUTH_GITHUB_SECRET',
    value: 'GitHub OAuth App 的 Client Secret',
    note: '后台 GitHub 登录需要。',
  },
  {
    name: 'ADMIN_GITHUB_LOGINS',
    value: '你的 GitHub 用户名',
    note: '后台白名单，多个用户名用逗号分隔。',
  },
  {
    name: 'NEXTAUTH_URL',
    value: 'https://blog.lumio.games',
    note: 'NextAuth 生成回调地址时使用。',
  },
  {
    name: 'NEXT_PUBLIC_SITE_URL',
    value: 'https://blog.lumio.games',
    note: '站点链接、sitemap 和 feed 使用。',
  },
];

const syncVariables = [
  {
    name: 'GITHUB_NOTES_OWNER',
    value: '笔记仓库 owner',
    note: '例如仓库是 https://github.com/Go1c/notes，这里填 Go1c。',
  },
  {
    name: 'GITHUB_NOTES_REPO',
    value: '笔记仓库名',
    note: '例如仓库是 https://github.com/Go1c/notes，这里填 notes。',
  },
  {
    name: 'GITHUB_NOTES_BRANCH',
    value: 'main',
    note: '笔记仓库分支，不填时默认 main。',
  },
  {
    name: 'GITHUB_WRITE_TOKEN',
    value: 'GitHub fine-grained token',
    note: '需要对笔记仓库有 Contents: Read and write 权限。',
  },
  {
    name: 'GITHUB_WEBHOOK_SECRET',
    value: '随机长密钥',
    note: 'GitHub Webhook 与服务器共同使用的签名密钥。',
  },
];

const optionalVariables = [
  {
    name: 'AI_TOKEN_PEPPER',
    value: '随机长密钥',
    note: '保护 /admin/ai-tokens 创建的 Agent API token。',
  },
  {
    name: 'SYNC_RECONCILE_CRON',
    value: '*/15 * * * *',
    note: '给 Zeabur 定时任务或外部 cron 参考。',
  },
];

export default function AdminSetupPage() {
  return (
    <section className="space-y-6">
      <div className="rounded-lg border border-stone-900/10 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold text-teal-700">Zeabur 配置说明</p>
        <h2 className="mt-2 text-2xl font-bold text-stone-950">先把服务器环境变量配好</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-700">
          后台登录、内容列表、AI 令牌和 GitHub 同步都依赖服务器环境变量。
          变量名必须保持英文，变量说明用中文写在这里。
        </p>
      </div>

      <ConfigTable
        description="这些变量决定后台能否登录、数据库能否访问。建议先配置它们。"
        title="必填变量"
        variables={requiredVariables}
      />

      <section className="rounded-lg border border-stone-900/10 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-bold text-stone-950">GitHub OAuth</h3>
        <p className="mt-2 text-sm leading-6 text-stone-700">
          在 GitHub 的 OAuth Apps 里创建应用。Homepage URL 填
          {' '}https://blog.lumio.games，Authorization callback URL 填下面这个地址：
        </p>
        <code className="mt-4 block overflow-x-auto rounded-md border border-stone-900/10 bg-stone-50 px-3 py-2 text-sm text-stone-900">
          https://blog.lumio.games/api/auth/callback/github
        </code>
        <p className="mt-3 text-sm leading-6 text-stone-700">
          创建后复制 Client ID 到 AUTH_GITHUB_ID，生成 Client Secret 后复制到
          AUTH_GITHUB_SECRET。
        </p>
      </section>

      <section className="rounded-lg border border-stone-900/10 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-bold text-stone-950">数据库初始化</h3>
        <p className="mt-2 text-sm leading-6 text-stone-700">
          在 Zeabur 项目里添加 PostgreSQL 服务，然后在 Web 服务里设置
          DATABASE_URL=${'{POSTGRES_CONNECTION_STRING}'}。第一次部署后进入 Web 服务
          Shell 运行：
        </p>
        <code className="mt-4 block overflow-x-auto rounded-md border border-stone-900/10 bg-stone-50 px-3 py-2 text-sm text-stone-900">
          npx prisma db push
        </code>
        <p className="mt-3 text-sm leading-6 text-stone-700">
          这个命令会创建 ContentItem、AiToken、AuditLog、SyncJob 等数据库表。
        </p>
      </section>

      <ConfigTable
        description="这些变量让服务器从你的 GitHub 笔记仓库同步内容，并把后台修改写回仓库。"
        title="GitHub 同步变量"
        variables={syncVariables}
      />

      <ConfigTable
        description="这些变量不是打开后台首页的最低要求，但建议生产环境也配置好。"
        title="可选但建议配置"
        variables={optionalVariables}
      />
    </section>
  );
}

function ConfigTable({
  description,
  title,
  variables,
}: {
  description: string;
  title: string;
  variables: Array<{
    name: string;
    value: string;
    note: string;
  }>;
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-stone-900/10 bg-white shadow-sm">
      <div className="border-b border-stone-900/10 px-6 py-4">
        <h3 className="text-lg font-bold text-stone-950">{title}</h3>
        <p className="mt-1 text-sm leading-6 text-stone-600">{description}</p>
      </div>
      <div className="divide-y divide-stone-900/10">
        {variables.map((variable) => (
          <div className="grid gap-3 px-6 py-4 md:grid-cols-[220px_minmax(0,1fr)]" key={variable.name}>
            <code className="text-sm font-semibold text-stone-950">{variable.name}</code>
            <div>
              <code className="block break-all rounded-md bg-stone-50 px-3 py-2 text-sm text-stone-900">
                {variable.value}
              </code>
              <p className="mt-2 text-sm leading-6 text-stone-600">{variable.note}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
