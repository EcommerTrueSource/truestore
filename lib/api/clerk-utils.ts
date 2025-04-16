'use server';

import { clerkClient } from '@clerk/nextjs/server';

/**
 * Atualiza os metadados públicos do usuário
 * Esses dados são acessíveis no frontend
 */
export async function updateUserPublicMetadata(
  userId: string, 
  metadata: Record<string, unknown>
) {
  try {
    const user = await clerkClient.users.updateUser(userId, {
      publicMetadata: metadata,
    });
    
    return { success: true, user };
  } catch (error) {
    console.error('Erro ao atualizar metadados públicos:', error);
    return { success: false, error };
  }
}

/**
 * Atualiza os metadados privados do usuário
 * Esses dados são acessíveis apenas no servidor
 */
export async function updateUserPrivateMetadata(
  userId: string, 
  metadata: Record<string, unknown>
) {
  try {
    const user = await clerkClient.users.updateUser(userId, {
      privateMetadata: metadata,
    });
    
    return { success: true, user };
  } catch (error) {
    console.error('Erro ao atualizar metadados privados:', error);
    return { success: false, error };
  }
}

/**
 * Define a role do usuário nos metadados públicos
 */
export async function setUserRole(userId: string, role: string) {
  return updateUserPublicMetadata(userId, { role });
}

/**
 * Obtém um usuário pelo ID
 */
export async function getUserById(userId: string) {
  try {
    const user = await clerkClient.users.getUser(userId);
    return { success: true, user };
  } catch (error) {
    console.error('Erro ao buscar usuário:', error);
    return { success: false, error };
  }
}

/**
 * Sincroniza dados do usuário com seu perfil na aplicação
 */
export async function syncUserProfile(
  userId: string,
  profileData: {
    displayName?: string;
    bio?: string;
    preferences?: Record<string, unknown>;
    lastUpdated?: string;
    // Adicione outros campos específicos do seu perfil aqui
  }
) {
  return updateUserPublicMetadata(userId, {
    profile: profileData,
  });
} 