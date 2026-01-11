export interface PluginMetaInput {
  /**
   * Unique plugin ID (must match directory name)
   * e.g., zotero-format-metadata@northword.cn
   */
  id: string
  /**
   * Plugin display name
   */
  name?: string
  /**
   * Short description
   */
  description?: string
  /**
   * Homepage or documentation URL
   */
  homepage?: string
  /**
   * Source code repository URL (GitHub/Gitee)
   */
  repoUrl?: string
  /**
   * (Deprecated, use updateUrl) The URL of `update.json`
   */
  update_json?: string
  /**
   * The URL of Zotero standard `update.json`
   */
  updateUrl: string
  /**
   * Plugin classification tags
   */
  tags?: TagType[]
  /**
   * Manually maintained versions list for patching
   * Follows Zotero Update Manifest format
   */
  patchedVersions?: Version[]
}

/**
 * 插件标签
 */
export type TagType
  // 推荐列表
  = | 'favorite'
  // 条目元数据维护
    | 'metadata'
  // UI相关
    | 'interface'
  // 附件管理相关
    | 'attachment'
  // 笔记增强
    | 'notes'
  // 阅读器增强
    | 'reader'
  // 效率增强、生产力工具
    | 'productivity'
  // 可视化、文库分析
    | 'visualization'
  // 第三方软件集成
    | 'integration'
  // AI 集成
    | 'ai'
  // 字处理软件集成或增强
    | 'writing'
  // 开发者工具
    | 'developer'
  // 其他
    | 'others'

// internal

/**
 * Update json
 * @see https://extensionworkshop.com/documentation/manage/updating-your-extension/
 * @lnik https://github.com/zotero-plugin-dev/zotero-plugin-scaffold/blob/main/src/types/update-json.ts
 */
export interface UpdateJSON {
  addons: {
    [addonID: string]: {
      updates: Array<{
        version: string
        update_link?: string
        /**
         * A cryptographic hash of the file pointed to by `update_link`.
         * This must be provided if `update_link` is not a secure URL.
         * If present, this must be a string beginning with either `sha256:` or `sha512:`,
         * followed by the hexadecimal-encoded hash of the matching type.
         */
        update_hash?: string
        applications: {
          /**
           * For Zotero 7 or newer
           *
           * strict_*_version is begin with Zotero version
           */
          zotero: {
            strict_min_version?: string
            strict_max_version?: string
          }
          /**
           * For Zotero 6 or older
           *
           * strict_*_version is begin with firefox version (60)
           */
          gecko?: {
            strict_min_version?: string
            strict_max_version?: string
          }
        }
      }>
    }
  }
}

export interface Version {
  version: string
  update_link: string
  update_hash?: string
  strict_min_version?: string
  strict_max_version?: string
}

/**
 * Repository statistics (fetched from GitHub API)
 */
export interface RepoStats {
  stars?: number
  forks?: number
  lastPush?: string
  description?: string
}

/**
 * Generated metadata output combining base info + versions + stats
 */
export interface GeneratedMeta extends PluginMetaInput {
  versions: Version[]
  stats?: RepoStats
  latestVersion?: string
  compatibleApps?: {
    zotero?: {
      min?: string
      max?: string
    }
  }
}

/**
 * Latest version info for quick indexing
 */
export interface LatestVersionInfo {
  pluginId: string
  version: string
  update_link: string
  update_hash?: string
  strict_min_version?: string
  strict_max_version?: string
}

/**
 * Plugin processing error
 */
export interface PluginError {
  pluginId: string
  stage: 'schema' | 'fetch' | 'xpi' | 'merge' | 'validation'
  message: string
}

/**
 * Overall processing result
 */
export interface ProcessResult {
  success: string[]
  errors: PluginError[]
}
