import styles from "../styles/Chat.module.css";
import React, { useCallback, useEffect, useRef, useState } from "react";

export default function Chat({ currentUser, session, supabase }) {
  const [error, setError] = useState("");
  const [chats, setChats] = useState([]);
  const [editingUsername, setEditingUsername] = useState(false);
  const [users, setUsers] = useState({});

  const words = useRef(null);
  const username = useRef("");

  useEffect(() => {
    const getMessages = async () => {
      let { data: messages, error } = await supabase
        .from("message")
        .select("*");

      if (error) return setError(error);

      setChats(messages);

      const setupMessagesSubscription = async () => {
        await supabase
          .from("message")
          .on("INSERT", (payload) => {
            setChats((previousMessages) =>
              [].concat(previousMessages, payload.new)
            );
          })
          .subscribe();
      };

      await setupMessagesSubscription();

      const setupUserSubscription = async () => {
        await supabase
          .from("user")
          .on("UPDATE", (payload) => {
            setUsers((previousUsers) => {
              const user = previousUsers[payload.new.id];

              if (user) {
                Object.assign({}, users, {
                  [payload.new.id]: payload.new,
                });
              } else {
                return users;
              }
            });
          })
          .subscribe();
      };

      await setupUserSubscription();
    };

    getMessages();
  }, [supabase, users]);

  const getUsersFromSupabase = useCallback(
    async (users, userIds) => {
      const usersToGet = Array.from(userIds).filter((userId) => !users[userId]); // because userIds is Set, so we use Array.from to convert Set to Array

      if (Object.keys(users).length && !usersToGet.length) return users;

      const { data } = await supabase
        .from("user")
        .select("id,username")
        .in("id", usersToGet);

      const newUsers = {};

      data.forEach((user) => (newUsers[user.id] = user));

      return Object.assign({}, users, newUsers);
    },
    [supabase]
  );

  useEffect(() => {
    const getUsers = async () => {
      const userIds = new Set(chats.map((chat) => chat.user_id)); // Set is ES6 feature which avoid repeat inside array (does not allow duplicate inside array) !!
      const newUsers = await getUsersFromSupabase(users || {}, userIds);
      setUsers(newUsers);
    };

    getUsers();
  }, [chats, supabase, getUsersFromSupabase, users]);

  const spitOut = async (event) => {
    event.preventDefault();

    const content = words.current.value;

    await supabase
      .from("message")
      .insert([{ content, user_id: session.user.id }]);

    words.current.value = "";
  };

  const logout = (event) => {
    event.preventDefault();

    // window.localStorage.clear(); // optional way: since supabase stores customer data locally ...
    supabase.auth.signOut();
  };

  const handleUsernameUpdate = async (event) => {
    event.preventDefault();

    const updatedUsername = username.current.value;

    await supabase
      .from("user")
      .insert([{ id: session?.user?.id, username: updatedUsername }], {
        upsert: true, // upsert means db will look after the new and existing records and update the existing one or create a brand new one
      });

    username.current.value = "";
    setEditingUsername(false);
  };

  const showUsername = (userId) => {
    if (!users) return "";

    const user = users[userId];

    return user?.username || `Unknown user (${user?.id})`;
  };

  if (!currentUser) return null;

  return (
    <>
      <div className={styles.header}>
        <div className={styles.headerText}>
          <h3>Chat chat</h3>
          <p>Welcome, {currentUser?.username || session?.user?.email}</p>
        </div>
        <div className={styles.settings}>
          {editingUsername ? (
            <form onSubmit={handleUsernameUpdate}>
              <input placeholder="New username" ref={username} required />
              <button type="submit">Update username</button>
            </form>
          ) : (
            <div>
              <button onClick={() => setEditingUsername(true)}>
                Edit username
              </button>
              <button onClick={logout}>Logout</button>
            </div>
          )}
        </div>
      </div>
      <div className={styles.container}>
        {error ? (
          <p>{error?.message}</p>
        ) : (
          chats.map((chat) => (
            <div key={chat.id} className={styles.messageContainer}>
              <span className={styles.user}>{showUsername(chat?.user_id)}</span>
              <p>{chat.content}</p>
            </div>
          ))
        )}

        <form className={styles.chat} onSubmit={spitOut}>
          <input
            className={styles.messageInput}
            placeholder="Write some words"
            required
            ref={words}
          />
          <button className={styles.submit} type="submit">
            Spit out
          </button>
        </form>
      </div>
    </>
  );
}
