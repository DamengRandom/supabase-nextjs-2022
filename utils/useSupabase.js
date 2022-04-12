import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_API_KEY
);

const useSupabase = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [session, setSession] = useState(supabase.auth.session());

  supabase.auth.onAuthStateChange(async (_event, session) => {
    setSession(session);
  });

  useEffect(() => {
    const getCurrentUser = async () => {
      if (session?.user?.id) {
        const { data: currentUser } = await supabase
          .from("user")
          .select("*")
          .eq("id", session?.user?.id);

        if (currentUser.length) {
          const foundUser = currentUser[0];

          supabase
            .from(`user:id=eq.${foundUser.id}`)
            .on("UPDATE", (payload) => {
              setCurrentUser(payload.new);
            })
            .subscribe();

          return foundUser;
        } else {
          return null;
        }
      }
    };

    (async () => {
      const theUser = await getCurrentUser();

      setCurrentUser(theUser);
    })();
  }, [session?.user?.id]);

  return { currentUser, session, supabase };
};

export default useSupabase;
