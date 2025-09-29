/**
 * Shared Database Utilities for WEBTOYS Agents
 *
 * Provides common database operations and Supabase client
 * configuration for all agents.
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { config } from "./config.js";
import { logger } from "./logger.js";

export class DatabaseManager {
  private supabase: SupabaseClient;
  private agentName: string;

  constructor(agentName: string) {
    this.agentName = agentName;

    // Validate configuration
    const validation = config.validate();
    if (!validation.valid) {
      logger.error("Database configuration invalid", validation.errors);
      throw new Error(
        `Database configuration invalid: ${validation.errors.join(", ")}`
      );
    }

    // Initialize Supabase client
    this.supabase = createClient(
      config.database.url,
      config.database.serviceKey
    );

    logger.info(`Database client initialized for ${agentName}`);
  }

  public getClient(): SupabaseClient {
    return this.supabase;
  }

  public async testConnection(): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from("wtaf_content")
        .select("count")
        .limit(1);

      if (error) {
        logger.error("Database connection test failed", error);
        return false;
      }

      logger.info("Database connection test successful");
      return true;
    } catch (error) {
      logger.error("Database connection test failed", error);
      return false;
    }
  }

  public async executeSQL(sql: string): Promise<{ data: any; error: any }> {
    logger.logDatabaseOperation("execute", "custom_sql", {
      sql: sql.substring(0, 100) + "...",
    });

    try {
      const { data, error } = await this.supabase.rpc("exec_sql", { sql });

      if (error) {
        logger.error("SQL execution failed", error);
      } else {
        logger.debug("SQL execution successful");
      }

      return { data, error };
    } catch (error) {
      logger.error("SQL execution error", error);
      return { data: null, error };
    }
  }

  public async getTableInfo(
    tableName: string
  ): Promise<{ data: any; error: any }> {
    logger.logDatabaseOperation("select", tableName);

    try {
      const { data, error } = await this.supabase
        .from(tableName)
        .select("*")
        .limit(1);

      return { data, error };
    } catch (error) {
      logger.error(`Failed to get table info for ${tableName}`, error);
      return { data: null, error };
    }
  }

  public async insertRecord(
    tableName: string,
    record: any
  ): Promise<{ data: any; error: any }> {
    logger.logDatabaseOperation("insert", tableName, record);

    try {
      const { data, error } = await this.supabase
        .from(tableName)
        .insert(record)
        .select();

      if (error) {
        logger.error(`Failed to insert record into ${tableName}`, error);
      } else {
        logger.debug(`Record inserted into ${tableName}`);
      }

      return { data, error };
    } catch (error) {
      logger.error(`Insert error for ${tableName}`, error);
      return { data: null, error };
    }
  }

  public async updateRecord(
    tableName: string,
    id: string,
    updates: any
  ): Promise<{ data: any; error: any }> {
    logger.logDatabaseOperation("update", tableName, { id, updates });

    try {
      const { data, error } = await this.supabase
        .from(tableName)
        .update(updates)
        .eq("id", id)
        .select();

      if (error) {
        logger.error(`Failed to update record in ${tableName}`, error);
      } else {
        logger.debug(`Record updated in ${tableName}`);
      }

      return { data, error };
    } catch (error) {
      logger.error(`Update error for ${tableName}`, error);
      return { data: null, error };
    }
  }

  public async deleteRecord(
    tableName: string,
    id: string
  ): Promise<{ data: any; error: any }> {
    logger.logDatabaseOperation("delete", tableName, { id });

    try {
      const { data, error } = await this.supabase
        .from(tableName)
        .delete()
        .eq("id", id)
        .select();

      if (error) {
        logger.error(`Failed to delete record from ${tableName}`, error);
      } else {
        logger.debug(`Record deleted from ${tableName}`);
      }

      return { data, error };
    } catch (error) {
      logger.error(`Delete error for ${tableName}`, error);
      return { data: null, error };
    }
  }
}

// Create database manager factory
export function createDatabaseManager(agentName: string): DatabaseManager {
  return new DatabaseManager(agentName);
}
