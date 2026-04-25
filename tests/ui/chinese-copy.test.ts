import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string) {
  return readFileSync(join(root, path), 'utf8');
}

describe('Chinese UI copy', () => {
  it('localizes the public home page', () => {
    const home = read('app/(site)/page.tsx');

    expect(home).toContain('Markdown 优先发布');
    expect(home).toContain('个人笔记，也要有真正的后台');
    expect(home).toContain('查看博客');
    expect(home).toContain('阅读文档');
  });

  it('localizes admin navigation and adds the setup guide route', () => {
    const layout = read('app/admin/layout.tsx');

    expect(layout).toContain('概览');
    expect(layout).toContain('内容');
    expect(layout).toContain('同步任务');
    expect(layout).toContain('目录规则');
    expect(layout).toContain('AI 令牌');
    expect(layout).toContain('配置说明');
    expect(existsSync(join(root, 'app/admin/setup/page.tsx'))).toBe(true);
  });

  it('documents server configuration in Chinese', () => {
    const setup = read('app/admin/setup/page.tsx');
    const readme = read('README.md');
    const runbook = read('devDoc/2026-04-25-zeabur-deploy-runbook.md');

    expect(setup).toContain('Zeabur 配置说明');
    expect(setup).toContain('GitHub OAuth');
    expect(setup).toContain('数据库初始化');
    expect(readme).toContain('中文配置速查');
    expect(runbook).toContain('Zeabur 中文部署说明');
  });
});
