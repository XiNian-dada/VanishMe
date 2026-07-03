# 发布指南

## 初始化 Git 仓库并推送到 GitHub

### 1. 初始化本地仓库

```bash
cd /Users/bernard/Code/VanishMe

# 初始化 git 仓库（如果还没有）
git init

# 添加所有文件
git add .

# 创建第一次提交
git commit -m "Initial commit: VanishMe privacy extension"
```

### 2. 在 GitHub 创建仓库

1. 访问 https://github.com/new
2. Repository name: `VanishMe`
3. Description: `浏览器隐私保护扩展 - 伪装你的浏览器指纹 | Browser privacy protection extension`
4. 选择 Public
5. **不要**勾选 "Add a README file" （我们已经有了）
6. **不要**勾选 "Add .gitignore" （我们已经有了）
7. **不要**勾选 "Choose a license" （我们已经有了）
8. 点击 "Create repository"

### 3. 关联远程仓库并推送

```bash
# 添加远程仓库
git remote add origin https://github.com/XiNian-dada/VanishMe.git

# 推送到 GitHub
git branch -M main
git push -u origin main
```

## 发布新版本

### 创建并推送 Tag 触发自动发布

GitHub Actions 会在推送新 tag 时自动构建并发布：

```bash
# 确保所有改动已提交
git add .
git commit -m "描述你的改动"

# 创建版本标签（遵循语义化版本）
git tag v1.0.0

# 推送代码和标签
git push origin main
git push origin v1.0.0
```

### 版本号规则（语义化版本）

- **v1.0.0** - 主版本.次版本.修订号
- **主版本（Major）**: 重大更新，不兼容的 API 变更
- **次版本（Minor）**: 新功能，向后兼容
- **修订号（Patch）**: Bug 修复，向后兼容

### 示例版本发布

```bash
# 第一个正式版本
git tag v1.0.0
git push origin v1.0.0

# 添加新功能
git tag v1.1.0
git push origin v1.1.0

# Bug 修复
git tag v1.1.1
git push origin v1.1.1

# 重大更新
git tag v2.0.0
git push origin v2.0.0
```

## GitHub Actions 自动化流程

推送 tag 后，GitHub Actions 会自动：

1. ✅ 检出代码
2. ✅ 安装 Node.js 和依赖
3. ✅ 构建扩展 (`npm run build`)
4. ✅ 打包 dist 文件夹为 zip
5. ✅ 生成更新日志
6. ✅ 创建 GitHub Release
7. ✅ 上传 `vanishme-v*.*.*.zip` 到 Release

## 查看构建状态

1. 推送 tag 后访问：https://github.com/XiNian-dada/VanishMe/actions
2. 点击最新的 "Release" workflow
3. 查看构建进度和日志
4. 构建成功后，Release 会自动出现在：https://github.com/XiNian-dada/VanishMe/releases

## 常见问题

### Q: Tag 推送失败？
```bash
# 删除本地 tag
git tag -d v1.0.0

# 删除远程 tag
git push origin :refs/tags/v1.0.0

# 重新创建 tag
git tag v1.0.0
git push origin v1.0.0
```

### Q: 如何修改已发布的 Release？
1. 访问 https://github.com/XiNian-dada/VanishMe/releases
2. 点击对应 Release 的 "Edit" 按钮
3. 修改内容后保存

### Q: 如何删除 Release？
1. 访问 https://github.com/XiNian-dada/VanishMe/releases
2. 点击对应 Release 的 "Delete" 按钮
3. 然后删除对应的 tag：
```bash
git push origin :refs/tags/v1.0.0
```

## 建议的发布流程

1. **开发阶段** - 在 feature 分支开发
2. **测试** - 本地构建并测试扩展功能
3. **合并** - 合并到 main 分支
4. **更新版本号** - 确认版本号符合语义化版本规范
5. **创建 Tag** - 创建并推送版本 tag
6. **等待构建** - GitHub Actions 自动构建和发布
7. **验证 Release** - 下载 zip 文件测试
8. **宣布发布** - 分享 Release 链接

## 首次发布建议

```bash
# 确保一切准备就绪
npm run build  # 本地测试构建
npm run type-check  # 类型检查

# 创建首个正式版本
git tag v1.0.0
git push origin main
git push origin v1.0.0
```

发布成功后，用户可以从：
https://github.com/XiNian-dada/VanishMe/releases/latest

下载最新版本的扩展！
