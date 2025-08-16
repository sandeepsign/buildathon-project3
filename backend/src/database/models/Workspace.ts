import { db } from '../connection';

export interface Workspace {
  id: string;
  slack_team_id: string;
  team_name: string;
  access_token: string;
  bot_token: string;
  created_at: Date;
  updated_at: Date;
}

export class WorkspaceModel {
  static async findBySlackTeamId(slackTeamId: string): Promise<Workspace | null> {
    const result = await db('workspaces')
      .select('id', 'slack_team_id', 'team_name', 'access_token', 'bot_token', 'created_at', 'updated_at')
      .where('slack_team_id', slackTeamId)
      .first();
    
    return result || null;
  }

  static async createOrUpdate(data: {
    slack_team_id: string;
    team_name: string;
    access_token: string;
    bot_token: string;
  }): Promise<Workspace> {
    const [result] = await db('workspaces')
      .insert({
        slack_team_id: data.slack_team_id,
        team_name: data.team_name,
        access_token: data.access_token,
        bot_token: data.bot_token
      })
      .onConflict('slack_team_id')
      .merge({
        team_name: data.team_name,
        access_token: data.access_token,
        bot_token: data.bot_token,
        updated_at: db.fn.now()
      })
      .returning(['id', 'slack_team_id', 'team_name', 'access_token', 'bot_token', 'created_at', 'updated_at']);
    
    return result;
  }

  static async getDefaultWorkspace(): Promise<Workspace | null> {
    const result = await db('workspaces')
      .select('id', 'slack_team_id', 'team_name', 'access_token', 'bot_token', 'created_at', 'updated_at')
      .orderBy('created_at', 'asc')
      .first();
    
    return result || null;
  }
}