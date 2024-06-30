# GolosinaLang


*Undergoing rewrite, if for some reason the interpreter is not working revert back to commit "921c0309edaf965e730f60dca4a0d491c0907a51"*

#### NOTE:
This is the closest thing I will make to an official specification for the time being.
This is not meant to be a super in-depth writeup. Rather something that aims to be practical in order to grasp the basics of the language and its
design.


## What is Golosina?

**Golosina is a dynamically typed, prototype oriented language meant to be fun to use, easy to read, and simple to learn.**

As someone who tinkers on his machine a lot, I have found myself in situtations where I feel a sense of dread when it comes to writing shell code for automation.
Golosina was made to hopefully fill that feeling as well, the language has support for direct shell embedding if necessary and in the future I plant to implement
some sort of concurrency model.

Golosina took a lot of insipiration from languages like IO, Javascript, lua, and ruby. IO and JS for its prototype design model (IO is also easy to read),
lua for its simplicity and lastly ruby, because in ruby everything is an object. Just how the human body has cells which can make tissue, in a pure OOP language
(something I am aiming achieve here) there is objects that can make greater objects, a concept that ruby implements well.

At the present time, there is only two interpreters which are still undergoing development. 
One is being built in nodejs in order for me to quickly
prototype and take different design choices with ease, and another interpreter is being built in c++, the goal is to fully implement the c++ one.
There is still a long road ahead but I have been steadily working on both.


## What is a prototype oriented language?

A prototye oriented language is a programming language, that aims to achieve Object Oriented Programming through the **Prototype** rather than the class.
The class is simply a blueprint for an object, a prototype is simply an object that is a parent to a derived object. The main takeway is that prototypes
thrive at runtime, and classes do not.

## Why is Golosina prototype based rather than class based like traditional languages like java?

One reason which is selfish is due to the ease and simplicity of the actual implementation of the prototype/prototype chain within the
interpreter. Another reason which may actually be valid for the end user is that, prototype based languages are extremely powerful in the sense
that you can create an entire class based system if the user wishes to (look at javascript and its class syntatic sugar), and if they dont they can
use a language that is OOP that introduces less concepts. A perfect language for beginners I dare say, if I was a new programmer or a person
who simply writes small scripts for automation, prototype based languages may be suitable to provide a gentle introduction to programming and the basics of OOP.
In traditional languages like Java, you may find more constructs that may be confusing for beginners.

# Examples

### Comments

```
  # This is how you can write a comment in golosina.  
```

### Variables

```
  # Constants
  
  const x = "Hello World";

  # Mutable Variables
  
  let y = "Hi";
```

### If Statements

```
  if (y == "Hello") {
    # If
  } else if (y == "Hi") {
    # Else If
  } else {
    # Else
  };
```

### Case Statement Expressions

Similar to languages like Nim, cases can be used as standalone statements or expressions. Ultimately whatever you choose to do,
the expression will have to return something, and if there is no specified return it will implicitly return Null.

```
  case (y) {
    of "Hi" {
      return 0;
    }

    of "Hello" {
     return "1" 
    }

    default {
      return 10;
    }
  };
```

```
  y = case (y) {
    of "Hi" {
      return 0;
    }

    of "Hello" {
     return "1" 
    }

    default {
      return 10;
    }
  };
```

## Loops

### While Statements

```
  let i = 0;
  while (i < 5) {
    ++i;
  };
```

### For Statements

```
  for (let i = 0; i < 10; ++i) {
    # Code in Here.
  };
```

## OOP

### Objects And Members

In order to instantiate a new object in golosina, you must first inherit the base object.

```
  const myObj = clone Object {
    y = 10,
    x = 30
  };
```

### Methods

Methods are procedures that can only act within an object, you can declare methods as follows.

```
  const x = {
    myMethod = method () {
      let x = 10;

      fmt->print("Returning:", x);

      return x;
    },

    greetAndCallMyMethod = method (name) {
      fmt->print("Hello, ", name);

      # You can reference the current object via the "this" keyword.
      
      return this->myMethod();
    }
  };

  x->greetAndCallMyMethod("Jake");
```

### Composition

In golosina you can achieve object composition by assigning an objects member to a reference of another object.

```
  const secondaryObj = clone Object {
    dependency = myObj,
    another = "MyField"  
  };
```

### Inheritance

As you have seen in the previous examples, you can achieve inheritance via the *"clone"* keyword.
When you clone an object, you instantiate a new instance of an object and set its prototype to whatever you are cloning.

When you need to use a member from a prototype object in some application, a *prototype chain* is initiated in order to recursively go through
prototypes and look for a matching member, until the *null* protoype is reached. If no member is found and the *null* prototype is reached,
the interpreter will throw an error mentioning the fact that the member you are referencing does not exist.

```
  const inheritFromMyObj = clone myObj {
    z = "Another field"
  };

  fmt->print(inheritFromMyObj->x);
```

### Example/Test Programs

For example/test programs, you can go to this repositories [test](https://github.com/NM711/GolosinaLangTS/tree/master/test) file.

## Running

You can run golosina by doing the following


```
  git clone https://github.com/NM711/GolosinaLangTS.git
```

```
  cd GolosinaLangTS
```

```
  npm install
```

### Running The Repl

```
  npm run repl
```


### Running Files

```
  npm run golosina -- <your-file-path-here> <flags>
```

#### Flags

```
  --dump-ast    # This will print the AST in JSON format
  --dump-tokens # This will print the tokens also in JSON format
```

## TODO

* Module System
