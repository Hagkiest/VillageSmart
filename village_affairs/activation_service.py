import psycopg2
import os
from datetime import datetime, timedelta
from pathlib import Path

# ── 远程数据库连接字符串（编译后嵌入二进制，用户不可见）────────────
_BUILTIN_DATABASE_URL = (
    "postgresql://postgres:7[MXRXN[Qe7vt"
    "@db.aqwsvnpcnyucvrkpycti.supabase.co:5432/postgres"
)

def _get_db_url():
    """优先从环境变量读取，否则使用内置连接字符串。"""
    return os.getenv("DATABASE_URL") or _BUILTIN_DATABASE_URL


def verify_activation_code_remote(code, secret_key):
    """
    Verifies activation code against remote Supabase DB.
    Returns: (is_valid, local_expire_datetime, message)
    """
    db_url = _get_db_url()
    if not db_url or "[YOUR-PASSWORD]" in db_url:
        return False, None, "远程数据库未配置"
    
    try:
        conn = psycopg2.connect(db_url)
        cursor = conn.cursor()
        
        # Check if code and key match
        query = "SELECT id, expire_time, valid_duration_days, activation_count FROM remote_activation_codes WHERE code = %s AND secret_key = %s"
        cursor.execute(query, (code, secret_key))
        result = cursor.fetchone()
        
        if not result:
            cursor.close()
            conn.close()
            return False, None, "激活码或密钥错误"
        
        record_id, expire_time, valid_duration_days, activation_count = result
        
        if activation_count <= 0:
            cursor.close()
            conn.close()
            return False, None, "激活码已被使用完"
        
        if expire_time and expire_time < datetime.now():
            cursor.close()
            conn.close()
            return False, None, "激活码已过期"
        
        # Decrement count
        update_query = "UPDATE remote_activation_codes SET activation_count = activation_count - 1 WHERE id = %s"
        cursor.execute(update_query, (record_id,))
        conn.commit()
        
        cursor.close()
        conn.close()
        
        # Calculate local expiration
        if valid_duration_days:
            local_expire = datetime.now() + timedelta(days=valid_duration_days)
        elif expire_time:
            local_expire = expire_time
        else:
            local_expire = datetime.now() + timedelta(days=365) # default 1 year
            
        return True, local_expire, "激活成功"
    except Exception as e:
        return False, None, f"远程验证失败: {str(e)}"
